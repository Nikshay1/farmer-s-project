import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Basic validation to ensure environment variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase URL or Anon Key is missing. Make sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
  // You might want to throw an error here or handle this more gracefully
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);