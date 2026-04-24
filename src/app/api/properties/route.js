import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'src/data/listings.json');

export async function GET() {
  try {
    // 1. Tentar buscar do Supabase primeiro
    const { data: dbData, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && dbData && dbData.length > 0) {
      return NextResponse.json(dbData);
    }

    // 2. Fallback para JSON local se DB estiver vazio ou der erro
    console.log('API: Usando fallback JSON local');
    const fileContents = fs.readFileSync(DATA_PATH, 'utf8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao carregar propriedades' }, { status: 500 });
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
