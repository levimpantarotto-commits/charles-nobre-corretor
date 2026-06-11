import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity-log';
import { qualificarLeadEmBackground } from '@/lib/qualificar-lead';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Payload inválido' }, { status: 400 });
  }

  const nome = (body.nome || body.name || '').trim();
  const telefone = (body.telefone || body.phone || '').trim();
  const email = (body.email || '').trim();
  const interesse = (body.interesse || body.property_title || '').trim();
  const mensagem = (body.mensagem || body.message || '').trim();

  if (!nome) {
    return NextResponse.json({ ok: false, erro: 'Nome obrigatório' }, { status: 400 });
  }

  const row = {
    name: nome,
    email: email || null,
    phone: telefone || null,
    property_title: interesse || null,
    notes: mensagem || null,
    source: (body.source || 'site').trim() || 'site',
  };

  const { data: inserted, error } = await supabase
    .from('leads')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[contato POST] erro inserindo lead:', error);
    return NextResponse.json({ ok: false, erro: 'Falha ao registrar' }, { status: 500 });
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
      leadId, nome, telefone, email, interesse, mensagem,
    }).catch((err) => console.error('[contato qualificacao bg]', err));
  });

  return NextResponse.json({ ok: true, lead_id: leadId });
}
