
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail loudly if the env vars are missing. Catches the classic
// "I edited .env.local but forgot to restart the dev server"
// bug before it becomes confusing later.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Check .env.local has VITE_SUPABASE_URL " +
    "and VITE_SUPABASE_ANON_KEY, and restart `npm run dev`."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);