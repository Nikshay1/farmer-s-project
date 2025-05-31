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
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('crop-pictures') // Ensure this is your bucket name
        .upload(filePath, file, {
            cacheControl: '3600', // Optional: cache control
            upsert: false // Optional: do not overwrite if file exists
        });

      if (uploadError) throw uploadError;

      // 2. Get the public URL of the uploaded image
      const { data: urlData } = supabase.storage
        .from('crop-pictures') // Ensure this is your bucket name
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Could not get public URL for the uploaded image.');
      }
      const imageUrl = urlData.publicUrl;

      // 3. Save image metadata to Supabase Database
      const { data: dbData, error: dbError } = await supabase
        .from('crop_images') // Ensure this is your table name
        .insert([{
          image_url: imageUrl,
          file_name: file.name,
          ai_analysis_completed: false, // Mark as not analyzed yet
          // user_id: supabase.auth.user()?.id // Uncomment if you implement Supabase auth
        }])
        .select() // Important to get the inserted row back, especially the ID
        .single(); // Assuming you insert one row and want it back

      if (dbError) throw dbError;

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