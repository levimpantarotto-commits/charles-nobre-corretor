import { NextResponse } from 'next/server';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';
import { logActivity } from '@/lib/activity-log';

const VALID_TYPES = new Set(['reuniao', 'ligacao', 'vistoria', 'tarefa', 'outro']);

function guard() {
  return Promise.resolve().then(async () => {
    if (!(await isAuthenticated())) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    if (!hasServiceRole) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });
    return null;
  });
}

export async function GET(request) {
  const denied = await guard();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let q = supabaseAdmin.from('events').select('*').order('event_date', { ascending: true });
  if (from) q = q.gte('event_date', from);
  if (to) q = q.lte('event_date', to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request) {
  const denied = await guard();
  if (denied) return denied;

  let body; try { body = await request.json(); } catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }); }
  const title = (body.title || '').trim();
  const event_date = body.event_date;
  if (!title || !event_date) return NextResponse.json({ error: 'title e event_date obrigatórios' }, { status: 400 });

  const event_type = VALID_TYPES.has(body.event_type) ? body.event_type : 'reuniao';

  const row = {
    title,
    description: (body.description || '').trim(),
    event_date,
    event_time: body.event_time || null,
    event_type,
    lead_id: body.lead_id || null,
    property_id: body.property_id || null,
    done: Boolean(body.done),
  };

  const { data, error } = await supabaseAdmin.from('events').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity({ message: `Evento criado: ${title} (${event_date})`, context: { id: data.id, event_type } });
  return NextResponse.json(data);
}
