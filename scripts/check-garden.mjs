// Verifica estado do Garden Residence: preco, fotos, e se images sao acessiveis.
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

const { data, error } = await supabase
  .from('properties')
  .select('*')
  .ilike('title', '%garden%')
  .order('created_at', { ascending: false });

if (error) { console.error(error); process.exit(1); }

console.log(`\n=== Encontrados ${data.length} registros com "garden" no titulo ===\n`);

for (const p of data) {
  console.log('---');
  console.log('ID:        ', p.id);
  console.log('Title:     ', p.title);
  console.log('Price:     ', p.price);
  console.log('Intent:    ', p.intent);
  console.log('City:      ', p.city);
  console.log('Bairro:    ', p.neighborhood);
  console.log('Created:   ', p.created_at);
  console.log('Updated:   ', p.updated_at || '(sem updated_at)');
  console.log('Images:    ', Array.isArray(p.images) ? `${p.images.length} fotos` : '(vazio)');
  if (Array.isArray(p.images) && p.images.length > 0) {
    console.log('  Primeira:', p.images[0]);
    console.log('  Ultima:  ', p.images[p.images.length - 1]);
  }
}

// Checa acessibilidade da primeira foto de cada um (HEAD request)
console.log('\n=== HEAD check das primeiras fotos ===\n');
for (const p of data) {
  if (!Array.isArray(p.images) || p.images.length === 0) continue;
  const url = p.images[0];
  const absUrl = /^https?:\/\//.test(url) ? url : `https://charlesrnobre.com.br${url}`;
  try {
    const res = await fetch(absUrl, { method: 'HEAD' });
    console.log(`${res.status} ${res.headers.get('content-type') || ''} -> ${absUrl.slice(0, 100)}`);
  } catch (err) {
    console.log(`ERR -> ${absUrl}: ${err.message}`);
  }
}
