/**
 * import-rokni-supabase.mjs
 * Importa os 158 imóveis da Rokni (rokni_imoveis.json) direto no Supabase do Charles.
 * Mapeia todos os campos: fotos, textos, áreas, financiamento, características.
 * Idempotente: não duplica (checa por origem_id + origem='rokni').
 *
 * Uso: node scripts/import-rokni-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(__dirname, 'rokni_imoveis.json');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente (.env.local)');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function montarFeatures(im) {
  const f = [];
  if (im.quartos)   f.push(`${im.quartos} Dormitório${im.quartos > 1 ? 's' : ''}${im.suites ? ` (${im.suites} Suíte${im.suites > 1 ? 's' : ''})` : ''}`);
  if (im.banheiros) f.push(`${im.banheiros} Banheiro${im.banheiros > 1 ? 's' : ''}`);
  if (im.vagas)     f.push(`${im.vagas} Vaga${im.vagas > 1 ? 's' : ''} de Garagem`);
  if (im.area_construida) f.push(`${im.area_construida}m² construídos`);
  if (im.area_total)      f.push(`${im.area_total}m² de terreno`);
  if (im.aceita_financiamento) f.push('Aceita Financiamento');
  // adiciona características reais (piscina, churrasqueira, etc)
  if (Array.isArray(im.caracteristicas)) f.push(...im.caracteristicas);
  return f;
}

function mapImovel(im) {
  const images = (im.imagens || [])
    .map(i => i.large || i.medium)
    .filter(Boolean);

  return {
    title:        im.titulo || `${im.tipo} em ${im.bairro}`,
    description:  im.descricao || '',
    price:        im.preco || 0,
    city:         im.cidade || 'Imbituba',
    neighborhood: im.bairro || '',
    type:         im.tipo || '',
    subtipo:      im.subtipo || '',
    category:     im.tipo || 'Residencial',
    intent:       'venda',
    state:        'SC',
    images,
    features:     montarFeatures(im),
    // campos enriquecidos
    quartos:         im.quartos || null,
    suites:          im.suites || null,
    banheiros:       im.banheiros || null,
    vagas:           im.vagas || null,
    area_total:      im.area_total || null,
    area_construida: im.area_construida || null,
    area_privativa:  im.area_privativa || null,
    terreno_frente:  im.terreno_frente || null,
    terreno_fundo:   im.terreno_fundo || null,
    terreno_direita: im.terreno_direita || null,
    terreno_esquerda: im.terreno_esquerda || null,
    aceita_financiamento: !!im.aceita_financiamento,
    aceita_mcmv:     !!im.aceita_mcmv,
    escriturado:     !!im.escriturado,
    permuta:         !!im.permuta,
    condominio:      im.condominio || null,
    latitude:        im.latitude || null,
    longitude:       im.longitude || null,
    stripe:          im.stripe || null,
    caracteristicas: Array.isArray(im.caracteristicas) ? im.caracteristicas : [],
    origem:          'rokni',
    origem_id:       String(im.rokni_id || ''),
    url_origem:      im.url_rokni || im.url_origem || null,
  };
}

(async () => {
  console.log('Lendo rokni_imoveis.json...');
  const lista = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  console.log(`${lista.length} imóveis no arquivo`);

  // Buscar origem_id já existentes pra não duplicar
  const { data: existentes } = await db
    .from('properties')
    .select('origem_id')
    .eq('origem', 'rokni');

  const jaImportados = new Set((existentes || []).map(e => e.origem_id));
  console.log(`${jaImportados.size} já importados anteriormente`);

  const novos = lista
    .filter(im => !jaImportados.has(String(im.rokni_id)))
    .map(mapImovel);

  console.log(`${novos.length} novos para inserir`);

  if (novos.length === 0) {
    console.log('Nada novo. Concluído.');
    return;
  }

  // Inserir em lotes de 20
  let inseridos = 0;
  const erros = [];
  for (let i = 0; i < novos.length; i += 20) {
    const lote = novos.slice(i, i + 20);
    const { data, error } = await db.from('properties').insert(lote).select('id');
    if (error) {
      erros.push(error.message);
      console.log(`Lote ${i / 20 + 1}: ERRO — ${error.message}`);
    } else {
      inseridos += data.length;
      console.log(`Lote ${i / 20 + 1}: +${data.length} (total ${inseridos})`);
    }
  }

  console.log(`\nConcluído! ${inseridos} imóveis inseridos no Supabase.`);
  if (erros.length) console.log('Erros:', erros);

  // Confirmar total
  const { count } = await db.from('properties').select('*', { count: 'exact', head: true });
  console.log(`Total de imóveis no catálogo agora: ${count}`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
