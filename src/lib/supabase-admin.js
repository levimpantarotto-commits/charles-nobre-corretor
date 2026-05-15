// Cliente Supabase com service_role key — usar SOMENTE no servidor (route handlers).
// Bypassa RLS. Nunca importar de Client Components.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = (url && serviceRoleKey)
  ? createClient(url, serviceRoleKey, { auth: { persistSession: false } })
  : null;

export const hasServiceRole = Boolean(url && serviceRoleKey);
