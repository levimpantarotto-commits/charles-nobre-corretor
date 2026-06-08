import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';
import { toCanonical, toSupabase, normalizeLegacy } from '@/lib/property-shape';
import { isAuthenticated } from '@/lib/admin-auth';
import { logActivity } from '@/lib/activity-log';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'src/data/listings.json');

function readLocalCanonical() {
  const fileContents = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(fileContents);
  return Array.isArray(data) ? data.map(normalizeLegacy).map((it) => toCanonical(it ?? {})) : [];
}

export async function GET() {
  try {
    // Ordena imóveis próprios do Charles primeiro (origem 'charles' < 'rokni' no alfabeto),
    // depois os importados. Dentro de cada grupo, mais recentes primeiro.
    const dbPromise = supabase
      .from('properties')
      .select('*')
      .order('origem', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase Timeout')), 12000)
    );

    const { data: dbData, error } = await Promise.race([dbPromise, timeoutPromise]);

    if (!error && Array.isArray(dbData) && dbData.length > 0) {
      return NextResponse.json(dbData.map(toCanonical));
    }

    if (error) console.warn('API properties: Supabase erro, usando fallback —', error.message);
    return NextResponse.json(readLocalCanonical());
  } catch (err) {
    console.error('API properties GET:', err.message);
    try {
      return NextResponse.json(readLocalCanonical());
    } catch (fsError) {
      return NextResponse.json({ error: 'Falha crítica ao carregar propriedades' }, { status: 500 });
    }
  }
}

export async function POST(request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  if (!hasServiceRole) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY ausente — defina em .env.local pra liberar gravação',
    }, { status: 503 });
  }

  try {
    const body = await request.json();
    const rows = Array.isArray(body) ? body : [body];
    const payload = rows.map((r) => toSupabase(normalizeLegacy(r)));

    const { error } = await supabaseAdmin.from('properties').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    logActivity({
      message: payload.length === 1
        ? `Imóvel salvo: ${payload[0].title}`
        : `${payload.length} imóveis salvos em lote`,
      context: { ids: payload.map((p) => p.id) },
    });
    return NextResponse.json({ success: true, count: payload.length });
  } catch (err) {
    console.error('API properties POST:', err);
    return NextResponse.json({ error: 'Falha ao gravar no Supabase' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (!hasServiceRole) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY ausente — defina em .env.local pra liberar gravação',
    }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const { error } = await supabaseAdmin.from('properties').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    logActivity({ message: `Imóvel excluído`, context: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API properties DELETE:', err);
    return NextResponse.json({ error: 'Falha ao deletar' }, { status: 500 });
  }
}
