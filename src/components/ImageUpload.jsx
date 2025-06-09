import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function ImageUpload({ onUploadSuccess, onUploadStart, onUploadError }) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setMessage(''); // Clear previous messages
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select an image to upload.');
      return;
    }

    setUploading(true);
    setMessage('Uploading image...');
    if (onUploadStart) onUploadStart();

    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`; // Sanitize file name
    const filePath = `${fileName}`; // You can add user-specific folders here if you implement auth

    try {
      // 1. Upload image to Supabase Storage
      const { /* data: uploadData, */ error: uploadError } = await supabase.storage // uploadData is unused, commented out to remove linter warning
        .from('crop-pictures') 
        .upload(filePath, file, {
            cacheControl: '3600', 
            upsert: false 
        });

      if (uploadError) throw uploadError;

      // 2. Get the public URL of the uploaded image
      const { data: urlData } = supabase.storage
        .from('crop-pictures')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Could not get public URL for the uploaded image.');
      }
      const imageUrl = urlData.publicUrl;

      // 3. Save image metadata to Supabase Database
      // Ensure this object matches your 'crop_images' table columns EXACTLY
      const insertPayload = {
        image_url: imageUrl,    // This is TEXT NOT NULL
        image_name: file.name,  // This is TEXT NULLABLE (matching our schema)
        analysis_result: null   // This is JSONB NULLABLE (matching our schema), explicitly set to null
        // If you have an 'ai_analysis_completed' BOOLEAN column, you can add it here:
        // ai_analysis_completed: false, 
      };

      console.log('Attempting to insert:', JSON.stringify(insertPayload, null, 2)); // Add this for debugging

      const { data: dbData, error: dbError } = await supabase
        .from('crop_images') 
        .insert([insertPayload]) // Use the payload object
        .select()
        .single();

      if (dbError) {
        console.error('Supabase DB Error:', dbError); // Log the detailed DB error
        throw dbError;
      }

      setMessage('Image uploaded successfully! AI analysis will begin shortly.');
      setUploading(false);
      if (onUploadSuccess) {
        onUploadSuccess(dbData); // Pass the new record (including its ID and image_url)
      }
      setFile(null); // Reset file input

    } catch (err) {
      console.error('Error during upload process:', err);
      setMessage(`Upload failed: ${err.message}`);
      setUploading(false);
      if (onUploadError) onUploadError(err.message);
    }
  };

  return (
    <div className="image-upload-container">
      <h3>Upload Crop Image</h3>
      <input 
        type="file" 
        accept="image/png, image/jpeg, image/jpg" 
        onChange={handleFileChange} 
        disabled={uploading} 
        aria-label="Select crop image"
      />
      <button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? 'Uploading...' : 'Upload & Analyze'}
      </button>
      {message && <p className={`message ${message.startsWith('Upload failed') ? 'error-message' : 'success-message'}`}>{message}</p>}
    </div>
  );
}

export default ImageUpload;