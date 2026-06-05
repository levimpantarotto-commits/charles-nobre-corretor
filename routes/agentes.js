const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// ─── Supabase ────────────────────────────────────────────────────────────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes)');
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Catálogo de agentes conhecidos ──────────────────────────────────────────
// Cada agente tem uma chave única (usada no heartbeat) e metadados descritivos.
// Adicione novos agentes aqui conforme o sistema cresce.
const AGENTES_CATALOGO = [
  { chave: 'maestro',        nome: 'Maestro',         descricao: 'Orquestrador central — distribui tarefas e monitora o ciclo' },
  { chave: 'briefing',       nome: 'Briefing',        descricao: 'Geração de briefing matinal com métricas do dia' },
  { chave: 'whatsapp',       nome: 'WhatsApp Agent',  descricao: 'Agente de conversação via WhatsApp (Evolution API)' },
  { chave: 'broadcast',      nome: 'Broadcast',       descricao: 'Disparo de mensagens em massa para leads' },
  { chave: 'followup',       nome: 'Follow-up',       descricao: 'Cadência de reativação WARM e COLD de leads' },
  { chave: 'blog',           nome: 'Blog Writer',     descricao: 'Geração e publicação automática de posts' },
  { chave: 'sync-sheets',    nome: 'Sync Sheets',     descricao: 'Sincronização de leads da Google Sheets para o Supabase' },
];

// ─── Cálculo de status ────────────────────────────────────────────────────────
// "rodando"   → último heartbeat < 2 min atrás
// "recente"   → último heartbeat < 10 min atrás
// "aguardando"→ último heartbeat < 60 min atrás
// "degradado" → teve falhas recentes (errors nas últimas 10 min)
// "pronto"    → nunca rodou (sem heartbeat registrado)
function calcularStatus(agente) {
  const { ultimo_heartbeat, falhas_recentes } = agente;

  if (!ultimo_heartbeat) return 'pronto';

  const diffMs = Date.now() - new Date(ultimo_heartbeat).getTime();
  const diffMin = diffMs / 60_000;

  if (falhas_recentes > 0 && diffMin < 10) return 'degradado';
  if (diffMin < 2)  return 'rodando';
  if (diffMin < 10) return 'recente';
  if (diffMin < 60) return 'aguardando';
  return 'pronto';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function buscarAgentes(supabase) {
  const { data, error } = await supabase
    .from('agentes')
    .select('*')
    .order('chave', { ascending: true });

  if (error && error.code !== 'PGRST116') throw error;

  // Merge catálogo com dados do banco
  const porChave = Object.fromEntries((data || []).map((a) => [a.chave, a]));

  return AGENTES_CATALOGO.map((def) => {
    const db = porChave[def.chave] || {};
    return {
      chave: def.chave,
      nome: def.nome,
      descricao: def.descricao,
      ultimo_heartbeat: db.ultimo_heartbeat || null,
      ultimo_ciclo: db.ultimo_ciclo || null,
      falhas_recentes: db.falhas_recentes || 0,
      meta: db.meta || null,
      status: calcularStatus({
        ultimo_heartbeat: db.ultimo_heartbeat || null,
        falhas_recentes: db.falhas_recentes || 0,
      }),
    };
  });
}

// ─── GET /api/agentes — lista todos com status calculado ─────────────────────
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const agentes = await buscarAgentes(supabase);
    return res.json({ agentes, total: agentes.length, gerado_em: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/agentes/status — resumo rápido ─────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const supabase = getSupabase();
    const agentes = await buscarAgentes(supabase);

    const contagem = { rodando: 0, recente: 0, aguardando: 0, pronto: 0, degradado: 0 };
    for (const a of agentes) {
      contagem[a.status] = (contagem[a.status] || 0) + 1;
    }

    const saudavel = contagem.rodando + contagem.recente;
    const atencao = contagem.degradado;
    const offline = contagem.aguardando + contagem.pronto;

    return res.json({
      ok: atencao === 0,
      resumo: { saudavel, atencao, offline },
      contagem,
      agentes: agentes.map((a) => ({ chave: a.chave, nome: a.nome, status: a.status })),
      gerado_em: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/agentes/tarefas — últimas 50 tarefas da fila ───────────────────
// Query: ?status=pendente|executando|concluido|erro
router.get('/tarefas', async (req, res) => {
  try {
    const supabase = getSupabase();
    const statusFiltro = req.query.status;
    const STATUSES_VALIDOS = ['pendente', 'executando', 'concluido', 'erro'];

    let query = supabase
      .from('tarefas_agentes')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(50);

    if (statusFiltro) {
      if (!STATUSES_VALIDOS.includes(statusFiltro)) {
        return res.status(400).json({
          error: `status inválido. Use: ${STATUSES_VALIDOS.join(', ')}`,
        });
      }
      query = query.eq('status', statusFiltro);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json({
      tarefas: data || [],
      total: (data || []).length,
      filtro: statusFiltro || null,
      gerado_em: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/agentes/:chave/heartbeat — registra heartbeat ─────────────────
// Body (opcional): { timestamp: ISO string }
router.post('/:chave/heartbeat', async (req, res) => {
  try {
    const { chave } = req.params;
    const timestamp = req.body?.timestamp || new Date().toISOString();

    // Valida timestamp se fornecido
    if (isNaN(new Date(timestamp).getTime())) {
      return res.status(400).json({ error: 'timestamp inválido' });
    }

    // Verifica se o agente existe no catálogo
    const def = AGENTES_CATALOGO.find((a) => a.chave === chave);
    if (!def) {
      return res.status(404).json({ error: `Agente '${chave}' não encontrado no catálogo` });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('agentes')
      .upsert(
        {
          chave,
          ultimo_heartbeat: timestamp,
          falhas_recentes: 0, // heartbeat bem-sucedido zera falhas
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'chave', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) throw error;

    const status = calcularStatus({
      ultimo_heartbeat: data.ultimo_heartbeat,
      falhas_recentes: data.falhas_recentes,
    });

    return res.json({
      ok: true,
      chave,
      status,
      ultimo_heartbeat: data.ultimo_heartbeat,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/agentes/ciclo — dispara ciclo do maestro manualmente ───────────
router.post('/ciclo', async (req, res) => {
  try {
    let maestro;
    try {
      maestro = require('../agentes/maestro');
    } catch (loadErr) {
      return res.status(503).json({
        error: 'Módulo maestro não encontrado',
        detalhe: loadErr.message,
      });
    }

    if (typeof maestro.ciclo !== 'function') {
      return res.status(503).json({ error: 'maestro.ciclo não é uma função exportada' });
    }

    console.log('[agentes] Ciclo do maestro disparado manualmente');
    const resultado = await maestro.ciclo();

    return res.json({
      ok: true,
      mensagem: 'Ciclo do maestro executado',
      resultado: resultado ?? null,
      executado_em: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[agentes] Falha ao executar ciclo do maestro:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/agentes/logs — últimos 100 logs de agentes ─────────────────────
router.get('/logs', async (req, res) => {
  try {
    const supabase = getSupabase();
    const chave = req.query.chave; // filtro opcional por agente
    const nivel = req.query.nivel; // filtro opcional: info|warn|error|debug
    const NIVEIS_VALIDOS = ['info', 'warn', 'error', 'debug'];

    if (nivel && !NIVEIS_VALIDOS.includes(nivel)) {
      return res.status(400).json({
        error: `nivel inválido. Use: ${NIVEIS_VALIDOS.join(', ')}`,
      });
    }

    let query = supabase
      .from('activity_log')
      .select('id, level, message, context, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (chave) {
      // Filtra logs que contenham a chave do agente no contexto ou na mensagem
      query = query.or(`message.ilike.%[${chave}]%,context->>agente.eq.${chave}`);
    }

    if (nivel) {
      query = query.eq('level', nivel);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json({
      logs: data || [],
      total: (data || []).length,
      filtros: { chave: chave || null, nivel: nivel || null },
      gerado_em: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = { router, calcularStatus, AGENTES_CATALOGO };
