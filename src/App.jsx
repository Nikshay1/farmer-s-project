import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [connectionStatus, setConnectionStatus] = useState('');

  useEffect(() => {
    const testSupabaseConnection = async () => {
      const { data, error } = await supabase.from('crop_images').select('*').limit(1);
      if (error) {
        console.error('❌ Supabase connection failed:', error.message);
        setConnectionStatus(`❌ Supabase connection failed: ${error.message}`);
      } else {
        console.log('✅ Supabase is connected! Sample data:', data);
        setConnectionStatus('✅ Supabase is connected!');
      }
    };

    testSupabaseConnection();
  }, []);

  return (
    <div>
      <h1>🌿 Crop Doctor AI 🌾</h1>
      <p>{connectionStatus || 'Checking Supabase connection...'}</p>
    </div>
  );
}

export default App;
