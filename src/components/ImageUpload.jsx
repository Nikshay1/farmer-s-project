import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function ImageUpload({ onUploadSuccess, onUploadStart, onUploadError }) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select an image to upload.');
      return;
    }

    setUploading(true);
    setMessage('Uploading image...');
    if (onUploadStart) onUploadStart();

    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;

    try {
      // 1. Upload file to Supabase Storage
      const { error: uploadError } = await supabase
        .storage
        .from('crop-pictures') // ✅ correct bucket
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error('Storage upload failed: ' + uploadError.message);
      }

      console.log('✅ File uploaded to storage:', fileName);

      // 2. Get public URL of the file
      const { data: urlData, error: urlError } = supabase
        .storage
        .from('crop-pictures')
        .getPublicUrl(fileName);

      if (urlError || !urlData?.publicUrl) {
        throw new Error('Failed to get public URL.');
      }

      const publicUrl = urlData.publicUrl;
      console.log('🌐 Public URL:', publicUrl);

      // 3. Insert into crop_images table
      const insertPayload = {
        image_url: publicUrl,
        file_name: file.name,
        analysis_result: null,
        ai_analysis_completed: false,
      };

      const { data: dbData, error: dbError } = await supabase
        .from('crop_images')
        .insert([insertPayload])
        .select()
        .single();

      if (dbError) {
        throw new Error('Database insert failed: ' + dbError.message);
      }

      console.log('✅ Inserted into DB:', dbData);

      setMessage('Image uploaded! Analysis will begin shortly.');
      setFile(null);
      setUploading(false);
      if (onUploadSuccess) onUploadSuccess(dbData);
    } catch (err) {
      console.error('🚨 Upload Error:', err);
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
        accept="image/png, image/jpeg"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? 'Uploading...' : 'Upload & Analyze'}
      </button>
      {message && (
        <p className={`message ${message.includes('failed') ? 'error-message' : 'success-message'}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default ImageUpload;
