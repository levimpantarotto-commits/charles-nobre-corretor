import { NextResponse } from 'next/server';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';
import { logActivity } from '@/lib/activity-log';

const VALID_TYPES = new Set(['reuniao', 'ligacao', 'vistoria', 'tarefa', 'outro']);

export async function PATCH(request, { params }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!hasServiceRole) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });

  const { id } = await params;
  let body; try { body = await request.json(); } catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }); }

  const patch = {};
  if (typeof body.title === 'string') patch.title = body.title.trim();
  if (typeof body.description === 'string') patch.description = body.description.trim();
  if (typeof body.event_date === 'string') patch.event_date = body.event_date;
  if ('event_time' in body) patch.event_time = body.event_time || null;
  if (typeof body.event_type === 'string' && VALID_TYPES.has(body.event_type)) patch.event_type = body.event_type;
  if (typeof body.done === 'boolean') patch.done = body.done;

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });

  const { data, error } = await supabaseAdmin.from('events').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity({ message: `Evento atualizado: ${data.title}`, context: { id, patch } });
  return NextResponse.json(data);
}

export async function DELETE(_request, { params }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!hasServiceRole) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity({ message: `Evento excluído`, context: { id } });
  return NextResponse.json({ success: true });
}
