import { createClient } from '@supabase/supabase-js'

// Create a single Supabase client instance
// Uses env variables from .env file
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,      // e.g. https://xyzcompany.supabase.co
  import.meta.env.VITE_SUPABASE_ANON_KEY  // public anon key
)
