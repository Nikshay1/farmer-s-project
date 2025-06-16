import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ImageUpload from './components/ImageUpload';
import History from './components/History';
import { supabase } from './supabaseClient'; // Ensure this path is correct
import './index.css'; // Import global styles

// Get Gemini API Key from environment variables
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error(
    "Gemini API Key is missing. Make sure you have a .env file with VITE_GEMINI_API_KEY."
  );
  // In a real app, you might disable AI functionality or show a prominent error to the user
}

// Initialize GoogleGenerativeAI client if API key is available
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

function App() {
  import { useEffect } from 'react';
import { supabase } from './supabaseClient';

useEffect(() => {
  const testSupabaseConnection = async () => {
    const { data, error } = await supabase.from('crop_images').select('*').limit(1);
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
    } else {
      console.log('✅ Supabase is connected! Data:', data);
    }
  };

  testSupabaseConnection();
}, []);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [refreshHistoryKey, setRefreshHistoryKey] = useState(0); // To trigger history refresh

  // This function is called after an image is successfully uploaded and its DB record created.
  const handleImageUploadedAndRecordCreated = async (imageRecord) => {
    if (!genAI) {
      const errorMessage = 'Google AI SDK not initialized. Check API Key.';
      setAnalysisMessage(errorMessage);
      setIsAnalyzing(false);
      // Update DB record to indicate error
      await updateDatabaseWithError(imageRecord.id, errorMessage);
      setRefreshHistoryKey(prev => prev + 1);
      return;
    }
    if (!imageRecord || !imageRecord.id || !imageRecord.image_url) {
      setAnalysisMessage('Invalid image record received for analysis.');
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisMessage(`Analyzing image: ${imageRecord.file_name}...`);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // PROMPT MODIFICATION START
      const prompt = `
        You are an agricultural expert. Analyze the following image of a crop.
        Your response MUST be a JSON object with the following keys: "disease_name", "cure_instructions".
        - "disease_name": Identify the likely disease. If healthy or unclear, state that.
        - "cure_instructions": Provide concise, actionable steps to treat the identified disease. Mention organic and chemical options if applicable.

        Example JSON response:
        {
          "disease_name": "Powdery Mildew",
          "cure_instructions": "Increase air circulation. Apply neem oil or a sulfur-based fungicide. Remove severely affected leaves."
        }
      `;
      // PROMPT MODIFICATION END

      // Fetch the image data as base64
      const imageResponse = await fetch(imageRecord.image_url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image for analysis (status: ${imageResponse.status})`);
      }
      const imageBlob = await imageResponse.blob();

      // Convert blob to base64
      const imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]); // Get base64 part
        reader.onerror = (error) => reject(new Error("Failed to read image as base64: " + error.message));
        reader.readAsDataURL(imageBlob);
      });

      const imageParts = [
        {
          inlineData: {
            data: imageBase64,
            mimeType: imageBlob.type, // e.g., 'image/jpeg'
          },
        },
      ];

      // Generate content
      const result = await model.generateContent([prompt, ...imageParts]);
      const aiResponseRaw = await result.response.text();

      let aiResponseJson;
      try {
        // Attempt to parse the JSON from the response
        // The model might sometimes include ```json ... ``` markers.
        const jsonStringMatch = aiResponseRaw.match(/```json\s*([\s\S]*?)\s*```/);
        let jsonString = aiResponseRaw;
        if (jsonStringMatch && jsonStringMatch[1]) {
          jsonString = jsonStringMatch[1];
        }
        // Trim whitespace and check if the string is empty or not valid JSON before parsing
        jsonString = jsonString.trim();
        if (!jsonString) {
          throw new Error("AI response was empty.");
        }
        aiResponseJson = JSON.parse(jsonString);
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", aiResponseRaw, parseError);
        throw new Error("AI response was not valid JSON. Raw response: " + aiResponseRaw);
      }

      // Update Supabase table with AI analysis results
      const { error: updateError } = await supabase
        .from('crop_images')
        .update({
          analysis_result: aiResponseJson, // Corrected assignment
          ai_analysis_completed: true, // Mark as successful
          ai_error_message: null // Clear any previous error
        })
        .eq('id', imageRecord.id);

      if (updateError) throw updateError;

      setAnalysisMessage(`Analysis complete for ${imageRecord.file_name}! Results saved.`);
    } catch (error) {
      console.error('Error analyzing image with AI:', error);
      setAnalysisMessage(`AI Analysis Error: ${error.message}`);
      // Update DB record to indicate error
      await updateDatabaseWithError(imageRecord.id, error.message);
    } finally {
      setIsAnalyzing(false);
      setRefreshHistoryKey(prevKey => prevKey + 1); // Trigger History re-fetch
    }
  };

  const updateDatabaseWithError = async (recordId, errorMessage) => {
    const { error: dbUpdateError } = await supabase
      .from('crop_images')
      .update({
        ai_analysis_completed: false, // Mark as failed
        ai_error_message: errorMessage.substring(0, 500) // Limit error message length
      })
      .eq('id', recordId);
    if (dbUpdateError) {
      console.error("Failed to update DB with error state:", dbUpdateError);
    }
  };

  const handleUploadError = (errorMessage) => {
    setAnalysisMessage(`Upload Error: ${errorMessage}`); // Display upload error
    setIsAnalyzing(false);
    // No need to refresh history here unless an empty record was created and needs showing an error
  };

  const handleUploadStart = () => {
    setAnalysisMessage('Upload in progress...');
    setIsAnalyzing(true); // Can use isAnalyzing to show a general loading state
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌿 Crop Doctor AI 🌾</h1>
        <p>Upload an image of your crop to detect diseases and get cure recommendations.</p>
        <p className="api-warning">
          <strong>Important:</strong> This demo uses client-side API calls for Google AI for simplicity.
          For a production app, move AI API calls to a secure backend (like Supabase Edge Functions) to protect your API key.
        </p>
      </header>

      <main>
        <ImageUpload
          onUploadSuccess={handleImageUploadedAndRecordCreated}
          onUploadError={handleUploadError}
          onUploadStart={handleUploadStart}
        />

        {analysisMessage && (
          <p className={`status-message ${isAnalyzing ? 'neutral-message' : (analysisMessage.includes('Error') || analysisMessage.includes('failed') ? 'error-message' : 'success-message')}`}>
            {analysisMessage}
          </p>
        )}

        <History refreshTrigger={refreshHistoryKey} />
      </main>

      <footer className="app-footer">
        <p>Crop Doctor AI - Helping Farmers with Technology</p>
      </footer>
    </div>
  );
}

export default App;
