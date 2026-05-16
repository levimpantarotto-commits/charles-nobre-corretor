// Sobe as fotos da pasta local no bucket `properties` do Supabase Storage,
// renomeando pra img01..imgNN.jpg, e atualiza o array `images` do registro.
//
// Uso:
//   node scripts/upload-fotos-aluguel-vila-nova.mjs

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const UUID = '4295bc7e-5e0a-4329-bd76-b4c1101eb4a7';
const SLUG = 'aluguel-vila-nova';
const PASTA_LOCAL =
  'C:/Users/55119/Documents/Levi/Milhonario/Mente Milhonaria/20_Projetos/02_Charles_Nobre/99_Neural_Flow/ap aluguel';
const BUCKET = 'properties';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Faltou NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 1. Garante bucket existe e é público
const { data: buckets, error: errList } = await supabase.storage.listBuckets();
if (errList) {
  console.error('Erro listando buckets:', errList);
  process.exit(1);
}

const exists = buckets.some((b) => b.name === BUCKET);
if (!exists) {
  console.log(`Bucket "${BUCKET}" nao existe. Criando como public...`);
  const { error: errCreate } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (errCreate) {
    console.error('Erro criando bucket:', errCreate);
    process.exit(1);
  }
  console.log('Bucket criado.');
} else {
  console.log(`Bucket "${BUCKET}" ja existe.`);
}

// 2. Lista arquivos locais (ordena natural: 2,3,4...10,11,12,13, + WhatsApp por ultimo)
const arquivos = (await fs.readdir(PASTA_LOCAL))
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  .sort((a, b) => {
    const ma = a.match(/^(\d+)\./);
    const mb = b.match(/^(\d+)\./);
    if (ma && mb) return Number(ma[1]) - Number(mb[1]);
    if (ma) return -1;
    if (mb) return 1;
    return a.localeCompare(b);
  });

console.log(`Encontrados ${arquivos.length} arquivos:`, arquivos);

// 3. Upload de cada um como img01.jpg, img02.jpg, ...
const urls = [];
for (let i = 0; i < arquivos.length; i++) {
  const local = arquivos[i];
  const remoto = `${SLUG}/img${String(i + 1).padStart(2, '0')}.jpg`;
  const buf = await fs.readFile(path.join(PASTA_LOCAL, local));
  const { error: errUp } = await supabase.storage
    .from(BUCKET)
    .upload(remoto, buf, { contentType: 'image/jpeg', upsert: true });
  if (errUp) {
    console.error(`Erro subindo ${local}:`, errUp);
    process.exit(1);
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(remoto);
  urls.push(pub.publicUrl);
  console.log(`[${i + 1}/${arquivos.length}] ${local} -> ${remoto}`);
}

// 4. UPDATE images do registro
const { data: updated, error: errUpd } = await supabase
  .from('properties')
  .update({ images: urls })
  .eq('id', UUID)
  .select()
  .single();

if (errUpd) {
  console.error('Erro atualizando registro:', errUpd);
  process.exit(1);
}

console.log('\nSucesso. Imovel atualizado:');
console.log('  Title:', updated.title);
console.log('  Fotos:', updated.images.length);
console.log('  Primeira:', updated.images[0]);
console.log('  Preview:', `https://charles-nobre-corretor.vercel.app/imovel/${UUID}`);
