import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'src/data/listings.json');

export async function GET() {
  try {
    // 1. Tentar buscar do Supabase com timeout de 3 segundos
    console.log('API: Iniciando busca no Supabase...');
    
    const dbPromise = supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase Timeout')), 3000)
    );

    const { data: dbData, error } = await Promise.race([dbPromise, timeoutPromise]);

    if (!error && dbData && dbData.length > 0) {
      console.log('API: Dados carregados do Supabase com sucesso');
      return NextResponse.json(dbData);
    }

    if (error) console.warn('API: Erro no Supabase:', error.message);
    
    // 2. Fallback para JSON local
    console.log('API: Usando fallback JSON local');
    const fileContents = fs.readFileSync(DATA_PATH, 'utf8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error.message);
    // Garantir fallback mesmo em erro catastrófico ou timeout
    try {
      console.log('API: Fallback de emergência (JSON local)');
      const fileContents = fs.readFileSync(DATA_PATH, 'utf8');
      const data = JSON.parse(fileContents);
      return NextResponse.json(data);
    } catch (fsError) {
      return NextResponse.json({ error: 'Falha crítica ao carregar propriedades' }, { status: 500 });
    }
  }
}

export async function POST(request) {
  try {
    const newData = await request.json();
    
    // Se for um array (reorder massivo), iteramos ou atualizamos
    if (Array.isArray(newData)) {
      for (const prop of newData) {
        await supabase.from('properties').upsert({
          id: prop.id,
          title: prop.title,
          images: prop.images,
          video: prop.video,
          price: prop.price,
          description: prop.description,
          type: prop.type,
          intent: prop.intent,
          location: prop.location,
          features: prop.features
        });
      }
    } else {
      // Único imóvel
      const { error } = await supabase.from('properties').upsert(newData);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save Error:', error);
    return NextResponse.json({ error: 'Falha ao gravar no Supabase' }, { status: 500 });
  }
}
