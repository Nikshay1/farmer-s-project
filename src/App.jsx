// src/App.jsx

import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabaseClient'; // Ensure this path is correct
import './index.css';

import ImageUpload from './components/ImageUpload';
import History from './components/History';

// Get Gemini API Key from environment variables
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [refreshHistoryKey, setRefreshHistoryKey] = useState(0);

  // 🔐 Check login state on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // 🔐 Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setLoginError(error.message);
  };

  // 🔓 Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // 🧠 AI analysis logic (from your current dashboard)
  const handleImageUploadedAndRecordCreated = async (imageRecord) => {
    if (!genAI) {
      const errorMessage = 'Google AI SDK not initialized. Check API Key.';
      setAnalysisMessage(errorMessage);
      setIsAnalyzing(false);
      await updateDatabaseWithError(imageRecord.id, errorMessage);
      setRefreshHistoryKey((prev) => prev + 1);
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
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
        You are an agricultural expert. Analyze the following image of a crop.
        Respond as a JSON with "disease_name" and "cure_instructions".
      `;

      const imageResponse = await fetch(imageRecord.image_url);
      const imageBlob = await imageResponse.blob();
      const imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(imageBlob);
      });

      const imageParts = [
        {
          inlineData: {
            data: imageBase64,
            mimeType: imageBlob.type,
          },
        },
      ];

      const result = await model.generateContent([prompt, ...imageParts]);
      const aiResponseRaw = await result.response.text();

      let aiResponseJson;
      try {
        const jsonStringMatch = aiResponseRaw.match(/```json\s*([\s\S]*?)\s*```/);
        let jsonString = aiResponseRaw;
        if (jsonStringMatch && jsonStringMatch[1]) {
          jsonString = jsonStringMatch[1];
        }
        aiResponseJson = JSON.parse(jsonString.trim());
      } catch (parseError) {
        throw new Error('AI response was not valid JSON. Raw response: ' + aiResponseRaw);
      }

      const { error: updateError } = await supabase
        .from('crop_images')
        .update({
          analysis_result: aiResponseJson,
          ai_analysis_completed: true,
          ai_error_message: null,
        })
        .eq('id', imageRecord.id);

      if (updateError) throw updateError;

      setAnalysisMessage(`Analysis complete for ${imageRecord.file_name}!`);
    } catch (error) {
      console.error('AI error:', error);
      setAnalysisMessage(`AI Analysis Error: ${error.message}`);
      await updateDatabaseWithError(imageRecord.id, error.message);
    } finally {
      setIsAnalyzing(false);
      setRefreshHistoryKey((prev) => prev + 1);
    }
  };

  const updateDatabaseWithError = async (recordId, errorMessage) => {
    await supabase.from('crop_images').update({
      ai_analysis_completed: false,
      ai_error_message: errorMessage.substring(0, 500),
    }).eq('id', recordId);
  };

  const handleUploadError = (msg) => {
    setAnalysisMessage(`Upload Error: ${msg}`);
    setIsAnalyzing(false);
  };

  const handleUploadStart = () => {
    setAnalysisMessage('Upload in progress...');
    setIsAnalyzing(true);
  };

  // 🧾 LOGIN PAGE
  if (!session) {
    return (
      <div className="login-container">
        <h2>Sign In</h2>
        <form onSubmit={handleLogin} style={{ maxWidth: '400px', margin: 'auto' }}>
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '10px', margin: '10px 0' }}
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '10px', margin: '10px 0' }}
          />
          <button type="submit" style={{ width: '100%', padding: '10px' }}>Login</button>
          {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
        </form>
      </div>
    );
  }

  // 🌾 MAIN APP PAGE
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌿 Crop Doctor AI 🌾</h1>
        <p>Upload an image of your crop to detect diseases and get cure recommendations.</p>
        <button onClick={handleLogout} style={{ float: 'right' }}>Logout</button>
        <p className="api-warning">
          <strong>Important:</strong> This demo uses client-side API calls for Google AI. Move AI logic to backend in production.
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
