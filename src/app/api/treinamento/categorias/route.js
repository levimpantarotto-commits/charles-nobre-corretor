import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const CATEGORIAS = ['dna_charles', 'argumentos', 'contratos', 'regiao', 'pipeline', 'regras', 'outros'];

export async function GET() {
  try {
    const db = supabaseAdmin;
    const { data, error } = await db
      .from('treinamento')
      .select('categoria')
      .eq('ativo', true);

    if (error) throw error;

    // Inicializa todas as categorias com 0
    const contagem = CATEGORIAS.reduce((acc, cat) => {
      acc[cat] = 0;
      return acc;
    }, {});

    for (const item of data) {
      const cat = CATEGORIAS.includes(item.categoria) ? item.categoria : 'outros';
      contagem[cat] = (contagem[cat] ?? 0) + 1;
    }

    return NextResponse.json(contagem);
  } catch (err) {
    console.error('[treinamento/categorias GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
