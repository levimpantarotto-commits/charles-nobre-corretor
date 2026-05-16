// Remove o folder de teste do bucket properties (post-validation cleanup)
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data, error } = await supabase.storage.from('properties').list('teste-upload-admin');
if (error) { console.error(error); process.exit(1); }
const paths = data.map((f) => `teste-upload-admin/${f.name}`);
if (paths.length === 0) { console.log('Nada pra limpar.'); process.exit(0); }

const { error: errRm } = await supabase.storage.from('properties').remove(paths);
if (errRm) { console.error(errRm); process.exit(1); }
console.log(`Removidos: ${paths.join(', ')}`);
