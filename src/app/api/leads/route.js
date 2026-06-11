import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';
import { logActivity } from '@/lib/activity-log';
import { qualificarLeadEmBackground } from '@/lib/qualificar-lead';

// POST público: captura lead do site
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  }

  const row = {
    name,
    email: (body.email || '').trim() || null,
    phone: (body.phone || '').trim() || null,
    property_title: (body.property_title || '').trim() || null,
    property_id: (body.property_id || '').trim() || null,
    notes: (body.message || body.mensagem || '').trim() || null,
    source: (body.source || 'site').trim() || 'site',
  };

  // Tenta capturar o id pra disparar qualificação em background
  const { data: inserted, error } = await supabase
    .from('leads')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Erro inserindo lead:', error);
    return NextResponse.json({ error: 'Falha ao registrar' }, { status: 500 });
  }

  const leadId = inserted?.id;

  logActivity({
    agent: 'site',
    message: `Novo lead capturado: ${row.name}${row.property_title ? ` (interesse em ${row.property_title})` : ''}`,
    context: { lead_id: leadId, source: row.source },
  });

  // SDR qualifica em background (não bloqueia resposta)
  setImmediate(() => {
    qualificarLeadEmBackground({
      leadId,
      nome: row.name,
      telefone: row.phone || '',
      email: row.email || '',
      interesse: row.property_title || '',
      mensagem: row.notes || '',
    }).catch((err) => console.error('[leads qualificacao bg]', err));
  });

  return NextResponse.json({ success: true, lead_id: leadId });
}

// GET admin: lista todos os leads ordenados por mais recente
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (!hasServiceRole) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
