import { NextResponse } from 'next/server';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';
import { logActivity } from '@/lib/activity-log';

const VALID_STATUS = new Set(['novo', 'em_atendimento', 'convertido', 'perdido']);

export async function PATCH(request, { params }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (!hasServiceRole) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });
  }

  const { id } = await params;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }); }

  const patch = {};
  if (typeof body.status === 'string') {
    if (!VALID_STATUS.has(body.status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (typeof body.notes === 'string') patch.notes = body.notes;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('leads')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (patch.status) {
    logActivity({
      message: `Lead "${data.name}" → ${patch.status}`,
      context: { id, status: patch.status },
    });
  }
  return NextResponse.json(data);
}

export async function DELETE(_request, { params }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (!hasServiceRole) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });
  }
  const { id } = await params;
  const { error } = await supabaseAdmin.from('leads').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  logActivity({ message: `Lead excluído`, context: { id } });
  return NextResponse.json({ success: true });
}
