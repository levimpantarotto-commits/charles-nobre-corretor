import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const todos = searchParams.get('todos') === 'true';

    const db = supabaseAdmin();
    let query = db
      .from('treinamento')
      .select('*')
      .order('criado_em', { ascending: false });

    if (!todos) {
      query = query.eq('ativo', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Agrupa por categoria
    const agrupado = data.reduce((acc, item) => {
      const cat = item.categoria ?? 'outros';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    return NextResponse.json(agrupado);
  } catch (err) {
    console.error('[treinamento GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await isAuthenticated(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { categoria, titulo, conteudo, tipo } = body;

    if (!categoria || !titulo || !conteudo) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: categoria, titulo, conteudo' },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from('treinamento')
      .insert({ categoria, titulo, conteudo, tipo, ativo: true, criado_em: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[treinamento POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
