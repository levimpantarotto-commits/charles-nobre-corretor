import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const db = supabaseAdmin;

    const now = new Date();
    const iniHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const fim7dias = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();

    const [
      { data: leadsData },
      { data: imoveisData },
      { count: agendaHoje },
      { count: agenda7dias },
      { count: aprovacoesPendentes },
      { data: briefingData },
    ] = await Promise.all([
      db.from('leads').select('status'),
      db.from('properties').select('status, corretor'),
      db.from('events').select('*', { count: 'exact', head: true }).gte('start_time', iniHoje).lt('start_time', new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()),
      db.from('events').select('*', { count: 'exact', head: true }).gte('start_time', iniHoje).lt('start_time', fim7dias),
      db.from('approvals').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      db.from('briefings').select('gerado_em').order('gerado_em', { ascending: false }).limit(1),
    ]);

    // Pipeline
    const pipeline = { total: 0, novo: 0, qualificado: 0, proposta: 0, fechado: 0, perdido: 0 };
    for (const lead of leadsData ?? []) {
      pipeline.total++;
      const status = lead.status ?? 'novo';
      if (status in pipeline) pipeline[status]++;
    }

    // Imóveis
    const imoveis = { total: 0, charles: 0, rokni: 0 };
    for (const imovel of imoveisData ?? []) {
      if (imovel.status === 'ativo' || imovel.ativo) {
        imoveis.total++;
        const corretor = (imovel.corretor ?? '').toLowerCase();
        if (corretor.includes('charles')) imoveis.charles++;
        else if (corretor.includes('rokni')) imoveis.rokni++;
      }
    }

    const resultado = {
      pipeline,
      imoveis,
      agenda: {
        hoje: agendaHoje ?? 0,
        proximos_7_dias: agenda7dias ?? 0,
      },
      aprovacoes: {
        pendentes: aprovacoesPendentes ?? 0,
      },
      briefing: {
        ultimo_gerado: briefingData?.[0]?.gerado_em ?? null,
      },
    };

    return NextResponse.json(resultado);
  } catch (err) {
    console.error('[liveops GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
