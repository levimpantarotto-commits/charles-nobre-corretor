const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Le .env.local
try { require('dotenv').config({ path: '.env.local' }); } catch {}

// Carregando do listings.json e site_configs.json local
const properties = JSON.parse(fs.readFileSync('./src/data/listings.json', 'utf8'));
const site_configs = JSON.parse(fs.readFileSync('./src/data/site_configs.json', 'utf8'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltam variáveis Supabase em .env.local');
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Aviso: rodando com anon key — RLS pode bloquear inserts. Use SUPABASE_SERVICE_ROLE_KEY pra writes reais.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('🚀 Iniciando migração para Supabase...');

  // 1. Limpar e Inserir Imóveis
  for (const prop of properties) {
    const { error } = await supabase
      .from('properties')
      .upsert({
        id: prop.id,
        title: prop.title,
        description: prop.description,
        price: prop.price,
        location: prop.location || { neighborhood: prop.neighborhood, city: prop.city },
        images: prop.images,
        features: prop.features,
        stats: prop.stats,
        type: prop.type,
        status: prop.status,
        intent: prop.intent,
        category: prop.category,
        video: prop.video
      });
    
    if (error) console.error(`❌ Erro ao subir imóvel ${prop.id}:`, error.message);
    else console.log(`✅ Imóvel ${prop.id} migrado.`);
  }

  // 2. Migrar Configurações
  const { error: configError } = await supabase
    .from('site_configs')
    .upsert({ id: 'main', data: site_configs });

  if (configError) console.error('❌ Erro ao subir configurações:', configError.message);
  else console.log('✅ Configurações do site migradas.');

  console.log('✨ Migração concluída!');
}

seed();
