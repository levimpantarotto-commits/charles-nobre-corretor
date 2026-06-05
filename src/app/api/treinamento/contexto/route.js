import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from('treinamento')
      .select('titulo, conteudo, categoria')
      .eq('ativo', true)
      .order('categoria', { ascending: true });

    if (error) throw error;

    const contexto = data
      .map((item) => `## ${item.titulo} [${item.categoria}]\n${item.conteudo}`)
      .join('\n\n---\n\n');

    return NextResponse.json({ contexto });
  } catch (err) {
    console.error('[treinamento/contexto GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
