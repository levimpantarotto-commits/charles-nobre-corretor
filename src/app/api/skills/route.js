import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';

export async function GET(request) {
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from('skills')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error('[skills GET]', err);
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
    const { slug, titulo, descricao, prompt_template, matchers } = body;

    if (!slug || !titulo || !prompt_template) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: slug, titulo, prompt_template' },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from('skills')
      .insert({ slug, titulo, descricao, prompt_template, matchers, criado_em: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[skills POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
