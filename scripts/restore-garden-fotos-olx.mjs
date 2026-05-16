// Restaura fotos do Garden Residence (UUID 43e7360d) a partir do anuncio na OLX.
// Baixa as fotos originais (alta resolucao), sobe no Storage do Supabase
// e atualiza o array images do registro.
//
// Anuncio: https://sc.olx.com.br/.../1407851963
// Preco ja foi ajustado pra 899k separadamente.

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const UUID = '43e7360d-ba86-4db4-a141-9ca095e6a844';
const SLUG = 'garden-residence';
const BUCKET = 'properties';
const OLX_URL =
  'https://sc.olx.com.br/florianopolis-e-regiao/imoveis/apartamento-a-venda-99m-3-quartos-1-suite-1-vaga-home-club-centro-imbituba-sc-1407851963';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// --- 1. Carregar HTML da OLX (baixado previamente via curl, OLX bloqueia fetch Node)
import fs from 'fs';
import os from 'os';

console.log('[1/4] Carregando HTML local da OLX...');
const htmlPath = process.env.OLX_HTML_PATH || path.join(os.tmpdir(), 'olx_page.html');
if (!fs.existsSync(htmlPath)) {
  console.error(`HTML nao encontrado em ${htmlPath}. Baixe primeiro com:`);
  console.error(`curl -sL -A "Mozilla/5.0 ..." "${OLX_URL}" -o "$TEMP/olx_page.html"`);
  process.exit(1);
}
const html = fs.readFileSync(htmlPath, 'utf8');
console.log(`  HTML: ${html.length} bytes`);

// --- 2. Extrair URLs originais da galeria
// Padrao: "original":"https://img.olx.com.br/images/.../<id>.jpg" (escapado com &quot;)
const decoded = html.replace(/&quot;/g, '"');
const regex = /"original":"(https:\/\/img\.olx\.com\.br\/images\/[^"]+\.jpg)"/g;
const fotos = [];
const seen = new Set();
let m;
while ((m = regex.exec(decoded)) !== null) {
  if (!seen.has(m[1])) {
    seen.add(m[1]);
    fotos.push(m[1]);
  }
}
console.log(`[2/4] Extraidas ${fotos.length} URLs unicas da galeria OLX`);
if (fotos.length === 0) {
  console.error('Nenhuma foto extraida. OLX mudou o HTML?');
  process.exit(1);
}

// --- 3. Baixar e subir cada uma
console.log('[3/4] Subindo no Supabase Storage...');
const finalUrls = [];
for (let i = 0; i < fotos.length; i++) {
  const olxUrl = fotos[i];
  const remote = `${SLUG}/img${String(i + 1).padStart(2, '0')}.jpg`;

  const fotoRes = await fetch(olxUrl, { headers: { 'User-Agent': UA } });
  if (!fotoRes.ok) {
    console.warn(`  [${i + 1}/${fotos.length}] FALHOU download (${fotoRes.status}): ${olxUrl}`);
    continue;
  }
  const buf = Buffer.from(await fotoRes.arrayBuffer());

  const { error: errUp } = await supabase.storage
    .from(BUCKET)
    .upload(remote, buf, { contentType: 'image/jpeg', upsert: true });
  if (errUp) {
    console.warn(`  [${i + 1}/${fotos.length}] FALHOU upload: ${errUp.message}`);
    continue;
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(remote);
  finalUrls.push(pub.publicUrl);
  console.log(`  [${i + 1}/${fotos.length}] ok -> ${remote} (${buf.length} bytes)`);
}

if (finalUrls.length === 0) {
  console.error('Nenhuma foto subiu. Abortando UPDATE.');
  process.exit(1);
}

// --- 4. UPDATE no registro
console.log(`[4/4] UPDATE images do Garden Residence (${UUID})...`);
const { data: updated, error: errUpd } = await supabase
  .from('properties')
  .update({ images: finalUrls })
  .eq('id', UUID)
  .select()
  .single();

if (errUpd) {
  console.error('Erro no UPDATE:', errUpd);
  process.exit(1);
}

console.log('\n=== SUCESSO ===');
console.log('Title:    ', updated.title);
console.log('Price:    ', `R$ ${(updated.price || 0).toLocaleString('pt-BR')}`);
console.log('Fotos:    ', updated.images.length);
console.log('Primeira: ', updated.images[0]);
console.log('Preview:  ', `https://charlesrnobre.com.br/imovel/${UUID}`);
