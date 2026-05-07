import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Build-time protection: Only create the client if credentials exist.
// This allows the build to pass and use the local JSON fallback if necessary.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      from: () => ({
        select: () => ({ order: () => Promise.resolve({ data: null, error: new Error('Supabase credentials missing') }) }),
        upsert: () => Promise.resolve({ error: new Error('Supabase credentials missing') })
      })
    };

