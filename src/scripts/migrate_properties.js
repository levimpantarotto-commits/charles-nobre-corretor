const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurações manuais baseadas no src/lib/supabase.js
const supabaseUrl = 'https://qilimxwoanxomukwifzl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbGlteHdvYW54b211a3dpZnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NTI1NjYsImV4cCI6MjA5MjIyODU2Nn0.edXoti2fJwa9AoANSzGj1oZGvqm7uiRgjQTwoLr-Qxg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrate() {
  console.log('--- Iniciando Migração de Imóveis Legados ---');
  
  const dataPath = path.join(__dirname, '../data/listings.json');
  if (!fs.existsSync(dataPath)) {
    console.error('ERRO: Arquivo listings.json não encontrado em:', dataPath);
    return;
  }

  const listings = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`Localizados ${listings.length} imóveis para migração.`);

  for (const item of listings) {
    console.log(`Processando: ${item.title}...`);
    
    // Verificar se já existe (por título ou ID legado)
    const { data: existing } = await supabase
      .from('properties')
      .select('id')
      .eq('title', item.title)
      .single();

    if (existing) {
      console.log(`Aviso: O imóvel "${item.title}" já reside no banco. Pulando...`);
      continue;
    }

    // Inserção no Supabase
    const payload = {
      title: item.title,
      description: item.description,
      price: item.price,
      city: item.location.city,
      neighborhood: item.location.neighborhood,
      category: item.category || item.type,
      images: item.images
    };

    const { error } = await supabase.from('properties').insert([payload]);
    
    if (error) {
      console.error(`ERRO ao inserir "${item.title}":`, error.message);
    } else {
      console.log(`SUCESSO: "${item.title}" migrado.`);
    }
  }

  console.log('--- Migração Concluída ---');
}

migrate();
