import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';

export async function PATCH(request, { params }) {
  try {
    const auth = await isAuthenticated(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const db = supabaseAdmin();
    const { data, error } = await db
      .from('skills')
      .update({ ...body, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error('[skills/[id] PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await isAuthenticated(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const db = supabaseAdmin();
    const { error } = await db.from('skills').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[skills/[id] DELETE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
