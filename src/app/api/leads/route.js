import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';

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
    source: (body.source || 'site').trim() || 'site',
  };

  const { error } = await supabase.from('leads').insert(row);
  if (error) {
    console.error('Erro inserindo lead:', error);
    return NextResponse.json({ error: 'Falha ao registrar' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
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
