// Sobe o video do Imbituba Garden Exclusive no Supabase Storage (96MB)
// e atualiza o campo `video` do registro 6b8a8b1a.
// Motivo: arquivo local nunca foi commitado, prod retorna 404.

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const UUID = '6b8a8b1a-8c1d-4e9a-b2c3-d4e5f6a7b8c9';
const BUCKET = 'properties';
const VIDEO_LOCAL = process.env.VIDEO_PATH || path.resolve(__dirname, '..', 'public/images/ap2/ap 2 garagens.mp4');
const VIDEO_REMOTE = 'imbituba-garden-exclusive/garagens.mp4';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

if (!fs.existsSync(VIDEO_LOCAL)) {
  console.error('Video local nao encontrado:', VIDEO_LOCAL);
  process.exit(1);
}

const stat = fs.statSync(VIDEO_LOCAL);
console.log(`Video local: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);

console.log('[1/2] Subindo no Supabase Storage...');
const buf = fs.readFileSync(VIDEO_LOCAL);
const { error: errUp } = await supabase.storage
  .from(BUCKET)
  .upload(VIDEO_REMOTE, buf, { contentType: 'video/mp4', upsert: true });
if (errUp) {
  console.error('Erro upload:', errUp);
  process.exit(1);
}

const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(VIDEO_REMOTE);
console.log('  URL publica:', pub.publicUrl);

console.log('[2/2] UPDATE video do registro...');
const { data: updated, error: errUpd } = await supabase
  .from('properties')
  .update({ video: pub.publicUrl })
  .eq('id', UUID)
  .select()
  .single();

if (errUpd) {
  console.error('Erro UPDATE:', errUpd);
  process.exit(1);
}

console.log('\n=== SUCESSO ===');
console.log('Title:', updated.title);
console.log('Video:', updated.video);
