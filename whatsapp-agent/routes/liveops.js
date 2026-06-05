// routes/liveops.js — Charles Neural System
// Terminal de automacao / live ops do Charles Nobre.
// Agrega dados das tabelas Supabase em queries simples e paralelas.
//
// Tabelas consultadas:
//   leads(id, status, source, created_at, whatsapp_status, last_whatsapp_at)
//   properties(id, status, tipo, origem, created_at)
//   events(id, event_date, title, done)
//   aprovacoes(id, status)
//   activity_log(id, agent, level, message, created_at)
//   whatsapp_messages(id, phone, direction, created_at)
//
// Endpoints:
//   GET /api/liveops         — agregacao completa
//   GET /api/liveops/status  — resumo pra header/badge

import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { getInstanceState } from '../lib/waha.js';
import { log } from '../lib/logger.js';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers de agregacao — cada um e independente, rodam em paralelo
// ---------------------------------------------------------------------------

async function agregarPipeline() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeIso = hoje.toISOString();

  const [{ count: total }, { data: porStatusData }, { count: hojeN }] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('status'),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', hojeIso),
  ]);

  const por_status = {};
  for (const row of porStatusData || []) {
    const s = row.status || 'sem_status';
    por_status[s] = (por_status[s] || 0) + 1;
  }

  return {
    total: total ?? 0,
    por_status,
    hoje: hojeN ?? 0,
  };
}

async function agregarImoveis() {
  const { data } = await supabase
    .from('properties')
    .select('id, status, tipo, origem');

  const lista = data || [];
  const ativos = lista.filter((p) => p.status === 'ativo' || p.status === 'active').length;

  const por_tipo = {};
  const por_origem = {};
  for (const p of lista) {
    if (p.tipo) por_tipo[p.tipo] = (por_tipo[p.tipo] || 0) + 1;
    if (p.origem) por_origem[p.origem] = (por_origem[p.origem] || 0) + 1;
  }

  return {
    total: lista.length,
    ativos,
    por_tipo,
    por_origem,
  };
}

async function agregarAgenda() {
  const agora = new Date();
  const hojeStr = agora.toISOString().slice(0, 10); // YYYY-MM-DD
  const em7Dias = new Date(agora.getTime() + 7 * 24 * 3600_000).toISOString().slice(0, 10);

  const [{ data: eventosHoje }, { count: proximos7 }] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, event_date, event_time, event_type, done, lead_id')
      .eq('event_date', hojeStr)
      .order('event_time', { ascending: true }),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gt('event_date', hojeStr)
      .lte('event_date', em7Dias)
      .eq('done', false),
  ]);

  return {
    hoje: eventosHoje || [],
    proximos_7_dias: proximos7 ?? 0,
  };
}

async function agregarWhatsapp() {
  const [estadoWaha, { count: leadsAtivos }] = await Promise.all([
    getInstanceState().catch(() => ({ instance: { state: 'desconhecido' } })),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .in('whatsapp_status', ['enviado', 'respondido']),
  ]);

  return {
    status: estadoWaha?.instance?.state ?? 'desconhecido',
    leads_ativos: leadsAtivos ?? 0,
  };
}

async function agregarAgentes() {
  // Considera "ativo" qualquer agente com atividade nas ultimas 24h.
  // "Degradado" = apareceu com level='error' nas ultimas 24h e nao tem
  // atividade 'info' posterior (simplificado: agente com erros recentes).
  const cutoff24h = new Date(Date.now() - 24 * 3600_000).toISOString();

  const { data: logs } = await supabase
    .from('activity_log')
    .select('agent, level, created_at')
    .gte('created_at', cutoff24h)
    .order('created_at', { ascending: false })
    .limit(500);

  const entradas = logs || [];

  // Ultima atividade geral
  const ultimaAtividade = entradas.length > 0 ? entradas[0].created_at : null;

  // Agentes unicos com atividade recente
  const agentesAtivos = new Set(entradas.map((e) => e.agent).filter(Boolean));

  // Agentes com erros recentes (sem atividade info posterior)
  const ultimoPorAgente = {};
  for (const e of entradas) {
    if (e.agent && !ultimoPorAgente[e.agent]) {
      ultimoPorAgente[e.agent] = e; // ja vem ordenado desc, primeiro = mais recente
    }
  }

  const degradados = Object.values(ultimoPorAgente).filter(
    (e) => e.level === 'error' || e.level === 'warn'
  ).length;

  return {
    ativos: agentesAtivos.size,
    degradados,
    ultima_atividade: ultimaAtividade,
  };
}

async function agregarAprovacoes() {
  const { count } = await supabase
    .from('aprovacoes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pendente');

  return {
    pendentes: count ?? 0,
  };
}

async function agregarBriefing() {
  // Ultimo briefing gerado = ultima entrada da activity_log com agent='briefing'
  // ou message ilike '%briefing%'. Score medio = media de scores de leads quentes.
  const [{ data: ultimoBriefingLog }, { data: leads }] = await Promise.all([
    supabase
      .from('activity_log')
      .select('created_at, message')
      .ilike('message', '%briefing%')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('leads')
      .select('score')
      .not('score', 'is', null),
  ]);

  const ultimoGerado = ultimoBriefingLog?.[0]?.created_at ?? null;

  const scores = (leads || []).map((l) => Number(l.score)).filter((s) => !isNaN(s));
  const scoreMedio =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

  return {
    ultimo_gerado: ultimoGerado,
    score_leads_medio: scoreMedio,
  };
}

// ---------------------------------------------------------------------------
// GET /api/liveops — agregacao completa
// ---------------------------------------------------------------------------
router.get('/', async (_req, res) => {
  try {
    const [pipeline, imoveis, agenda, whatsapp, agentes, aprovacoes, briefing] =
      await Promise.all([
        agregarPipeline(),
        agregarImoveis(),
        agregarAgenda(),
        agregarWhatsapp(),
        agregarAgentes(),
        agregarAprovacoes(),
        agregarBriefing(),
      ]);

    res.json({
      ok: true,
      gerado_em: new Date().toISOString(),
      pipeline,
      imoveis,
      agenda,
      whatsapp,
      agentes,
      aprovacoes,
      briefing,
    });
  } catch (err) {
    log.error('liveops.full falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/liveops/status — resumo pra header/badge
// ---------------------------------------------------------------------------
router.get('/status', async (_req, res) => {
  try {
    const [
      { count: leadsTotal },
      { count: aprovacoesPendentes },
      { count: imoveisAtivos },
      estadoWaha,
      { count: eventosHoje },
    ] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase
        .from('aprovacoes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente'),
      supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo'),
      getInstanceState().catch(() => ({ instance: { state: 'desconhecido' } })),
      supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('event_date', new Date().toISOString().slice(0, 10))
        .eq('done', false),
    ]);

    res.json({
      ok: true,
      leads_total: leadsTotal ?? 0,
      aprovacoes_pendentes: aprovacoesPendentes ?? 0,
      imoveis_ativos: imoveisAtivos ?? 0,
      whatsapp_status: estadoWaha?.instance?.state ?? 'desconhecido',
      eventos_hoje: eventosHoje ?? 0,
    });
  } catch (err) {
    log.error('liveops.status falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

export default router;
