import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [status, setStatus] = useState("Checking connection...");

  useEffect(() => {
    const checkSupabase = async () => {
      const { data, error } = await supabase.from("crop_images").select("*").limit(1);
      if (error) {
        console.error("❌ Supabase connection error:", error.message);
        setStatus(`❌ Connection failed: ${error.message}`);
      } else {
        console.log("✅ Supabase connected. Sample data:", data);
        setStatus("✅ Supabase connected!");
      }
    };
    checkSupabase();
  }, []);

  return (
    <div>
      <h1>🌿 Crop Doctor AI 🌾</h1>
      <p>{status}</p>
    </div>
  );
}

export default App;
