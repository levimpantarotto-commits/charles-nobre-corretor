// routes/qualidade.js — Analise de qualidade das conversas do whatsapp-agent.
// Montado em server.js: app.use('/api/qualidade', requireToken, qualidadeRouter);
import { Router } from 'express';
import axios from 'axios';
import { supabase } from '../lib/supabase.js';
import { chat } from '../lib/groq.js';
import { log } from '../lib/logger.js';

const router = Router();

const BASE_AGENT_URL = process.env.AGENT_INTERNAL_URL || `http://localhost:${process.env.PORT || 3030}`;
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buscarContextoTreinamento() {
  try {
    const { data } = await axios.get(`${BASE_AGENT_URL}/api/treinamento/contexto`, {
      headers: { 'x-webhook-token': WEBHOOK_TOKEN },
      timeout: 10000,
    });
    return data?.contexto || data?.texto || JSON.stringify(data) || '';
  } catch (err) {
    log.warn('qualidade: falha buscando contexto de treinamento', { err: err.message });
    return '';
  }
}

async function buscarConversaEvolution(phone) {
  const BASE = process.env.EVOLUTION_API_URL;
  const KEY = process.env.EVOLUTION_API_KEY;
  const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME;

  if (!BASE || !KEY || !INSTANCE) {
    throw new Error('Variaveis EVOLUTION_API_URL / EVOLUTION_API_KEY / EVOLUTION_INSTANCE_NAME ausentes');
  }

  const { data } = await axios.get(
    `${BASE}/chat/findMessages/${INSTANCE}`,
    {
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      params: { where: JSON.stringify({ key: { remoteJid: `${phone}@s.whatsapp.net` } }), limit: 50 },
      timeout: 20000,
    }
  );

  // Fallback: Evolution v2 as vezes retorna array diretamente ou { messages: [...] }
  const msgs = Array.isArray(data) ? data : (data?.messages || data?.data || []);
  return msgs.slice(-50); // garante no max 50
}

async function buscarConversaSupabase(phone, limit = 50) {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('direction, body, created_at, agent_response')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).reverse();
}

function formatarMensagensParaAnalise(msgs) {
  if (!msgs || msgs.length === 0) return '(sem mensagens)';
  return msgs
    .map((m) => {
      const dir = m.direction === 'in' ? 'Lead' : 'IA';
      const ts = m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : '';
      return `[${dir}${ts ? ' ' + ts : ''}]: ${(m.body || '').slice(0, 500)}`;
    })
    .join('\n');
}

function formatarMensagensEvolution(msgs) {
  if (!msgs || msgs.length === 0) return '(sem mensagens)';
  return msgs
    .map((m) => {
      const fromMe = m.key?.fromMe;
      const dir = fromMe ? 'IA' : 'Lead';
      const body =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        '[midia]';
      return `[${dir}]: ${(body || '').slice(0, 500)}`;
    })
    .join('\n');
}

// ---------------------------------------------------------------------------
// GET /api/qualidade/resumo
// ---------------------------------------------------------------------------
router.get('/resumo', async (_req, res) => {
  try {
    // Total e score medio
    const { data: analises, error: e1 } = await supabase
      .from('analises_conversa')
      .select('id, score, erros, created_at');
    if (e1) throw e1;

    const total = analises?.length || 0;
    const scoreMedio =
      total > 0
        ? Math.round(
            (analises.reduce((acc, a) => acc + (a.score || 0), 0) / total) * 10
          ) / 10
        : null;

    // Erros mais comuns (agrega todos os arrays de erros)
    const contagemErros = {};
    for (const a of analises || []) {
      for (const erro of a.erros || []) {
        const key = String(erro).trim();
        if (key) contagemErros[key] = (contagemErros[key] || 0) + 1;
      }
    }
    const errosMaisComuns = Object.entries(contagemErros)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([erro, qtd]) => ({ erro, qtd }));

    // Regras pendentes
    const { count: regrasPendentes, error: e2 } = await supabase
      .from('regras_aprendidas')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'proposta');
    if (e2) throw e2;

    res.json({
      ok: true,
      total_analises: total,
      score_medio: scoreMedio,
      erros_mais_comuns: errosMaisComuns,
      regras_pendentes_count: regrasPendentes || 0,
    });
  } catch (err) {
    log.error('qualidade/resumo falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/qualidade/analises?limit=20
// ---------------------------------------------------------------------------
router.get('/analises', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const { data, error } = await supabase
      .from('analises_conversa')
      .select('id, phone, score, pontos_fortes, pontos_fracos, erros, regras_sugeridas, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    res.json({ ok: true, count: data?.length || 0, analises: data || [] });
  } catch (err) {
    log.error('qualidade/analises falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/qualidade/regras?status=proposta
// ---------------------------------------------------------------------------
router.get('/regras', async (req, res) => {
  try {
    const status = req.query.status || 'proposta';

    let q = supabase
      .from('regras_aprendidas')
      .select('id, regra, origem_analise_id, status, created_at')
      .order('created_at', { ascending: false });

    if (status !== 'todas') q = q.eq('status', status);

    const { data, error } = await q.limit(200);
    if (error) throw error;

    res.json({ ok: true, status_filtro: status, count: data?.length || 0, regras: data || [] });
  } catch (err) {
    log.error('qualidade/regras falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/qualidade/analisar/:phone
// ---------------------------------------------------------------------------
router.post('/analisar/:phone', async (req, res) => {
  const { phone } = req.params;
  if (!phone) return res.status(400).json({ error: 'phone obrigatorio' });

  try {
    // 1. Busca conversa — tenta Evolution primeiro, cai para Supabase se falhar
    let transcricao = '';
    let fonteDados = 'evolution';
    try {
      const evMsgs = await buscarConversaEvolution(phone);
      transcricao = formatarMensagensEvolution(evMsgs);
    } catch (err) {
      log.warn('qualidade/analisar: Evolution falhou, usando Supabase', {
        phone,
        err: err.message,
      });
      fonteDados = 'supabase';
      const sbMsgs = await buscarConversaSupabase(phone, 50);
      transcricao = formatarMensagensParaAnalise(sbMsgs);
    }

    if (!transcricao || transcricao === '(sem mensagens)') {
      return res.status(404).json({ error: 'Nenhuma mensagem encontrada para esse phone' });
    }

    // 2. Busca contexto de treinamento
    const contexto = await buscarContextoTreinamento();

    // 3. Monta prompt de analise
    const systemPrompt = `Voce e um avaliador especializado em atendimento imobiliario via WhatsApp.
Sua tarefa e analisar a conversa abaixo e retornar uma avaliacao estruturada em JSON, sem texto fora do JSON.

${contexto ? `CONTEXTO E REGRAS DO AGENTE:\n${contexto}\n\n` : ''}Retorne SOMENTE um objeto JSON com esta estrutura exata:
{
  "score": <numero de 0 a 10, sendo 10 excelente>,
  "pontos_fortes": ["<ponto 1>", "<ponto 2>"],
  "pontos_fracos": ["<ponto 1>", "<ponto 2>"],
  "erros": ["<erro especifico 1>", "<erro especifico 2>"],
  "regras_sugeridas": ["<regra curta e acionavel 1>", "<regra curta e acionavel 2>"]
}

Criterios de avaliacao:
- O agente seguiu a pipeline de qualificacao na ordem correta?
- O tom foi natural, coloquial e profissional (sem parecer robo)?
- As mensagens foram curtas (max ~15 palavras)?
- O agente fez apenas uma pergunta por turno?
- O agente evitou inventar informacoes nao listadas no catalogo?
- O agente identificou corretamente os sinais ja dados pelo lead?
- O agente chegou ao encerramento correto quando 5/6 pontos foram checados?
- Erros de escrita, formato ou comportamento indesejado?`;

    const userPrompt = `CONVERSA PARA ANALISAR (ultimas 50 mensagens, fonte: ${fonteDados}):\n\n${transcricao}`;

    const raw = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.3, maxTokens: 1200 }
    );

    // 4. Parse do JSON retornado pelo Groq
    let analise;
    try {
      // Remove eventuais blocos de codigo markdown que o LLM possa ter adicionado
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      analise = JSON.parse(cleaned);
    } catch {
      log.warn('qualidade/analisar: falha no parse do JSON do Groq', { raw: raw.slice(0, 300) });
      return res.status(502).json({ error: 'Groq retornou resposta invalida', raw });
    }

    const { score, pontos_fortes, pontos_fracos, erros, regras_sugeridas } = analise;

    // 5. Persiste resultado em analises_conversa
    const { data: saved, error: saveErr } = await supabase
      .from('analises_conversa')
      .insert({
        phone,
        score: typeof score === 'number' ? score : parseFloat(score) || 0,
        pontos_fortes: Array.isArray(pontos_fortes) ? pontos_fortes : [],
        pontos_fracos: Array.isArray(pontos_fracos) ? pontos_fracos : [],
        erros: Array.isArray(erros) ? erros : [],
        regras_sugeridas: Array.isArray(regras_sugeridas) ? regras_sugeridas : [],
        meta: { fonte_dados: fonteDados },
      })
      .select()
      .single();
    if (saveErr) throw saveErr;

    // 6. Persiste cada regra sugerida como proposta em regras_aprendidas
    if (Array.isArray(regras_sugeridas) && regras_sugeridas.length > 0) {
      const regrasRows = regras_sugeridas
        .filter((r) => r && String(r).trim())
        .map((r) => ({
          regra: String(r).trim(),
          origem_analise_id: saved.id,
          status: 'proposta',
        }));
      if (regrasRows.length > 0) {
        const { error: regrasErr } = await supabase
          .from('regras_aprendidas')
          .insert(regrasRows);
        if (regrasErr) log.warn('qualidade/analisar: falha salvando regras sugeridas', { err: regrasErr.message });
      }
    }

    log.info('qualidade/analisar: analise concluida', { phone, score, analise_id: saved.id });
    res.json({ ok: true, analise: saved });
  } catch (err) {
    log.error('qualidade/analisar falhou', { phone, err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/qualidade/aprovar-regra/:id
// ---------------------------------------------------------------------------
router.post('/aprovar-regra/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Busca a regra
    const { data: regra, error: e1 } = await supabase
      .from('regras_aprendidas')
      .select('*')
      .eq('id', id)
      .single();
    if (e1 || !regra) return res.status(404).json({ error: 'Regra nao encontrada' });
    if (regra.status !== 'proposta') {
      return res.status(400).json({ error: `Regra ja esta com status "${regra.status}"` });
    }

    // 2. Atualiza status pra 'aprovada'
    const { error: e2 } = await supabase
      .from('regras_aprendidas')
      .update({ status: 'aprovada', aprovada_at: new Date().toISOString() })
      .eq('id', id);
    if (e2) throw e2;

    // 3. Cria item de treinamento na categoria 'regras'
    const { data: treinamento, error: e3 } = await supabase
      .from('treinamento')
      .insert({
        categoria: 'regras',
        conteudo: regra.regra,
        origem: 'analise_qualidade',
        origem_ref_id: regra.origem_analise_id || null,
        meta: { regra_id: id, aprovada_via: 'api' },
      })
      .select()
      .single();
    if (e3) throw e3;

    log.info('qualidade/aprovar-regra: regra aprovada e inserida em treinamento', {
      regra_id: id,
      treinamento_id: treinamento.id,
    });
    res.json({ ok: true, regra_id: id, treinamento_id: treinamento.id });
  } catch (err) {
    log.error('qualidade/aprovar-regra falhou', { id, err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/qualidade/rejeitar-regra/:id
// ---------------------------------------------------------------------------
router.post('/rejeitar-regra/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: regra, error: e1 } = await supabase
      .from('regras_aprendidas')
      .select('id, status')
      .eq('id', id)
      .single();
    if (e1 || !regra) return res.status(404).json({ error: 'Regra nao encontrada' });
    if (regra.status !== 'proposta') {
      return res.status(400).json({ error: `Regra ja esta com status "${regra.status}"` });
    }

    const { error: e2 } = await supabase
      .from('regras_aprendidas')
      .update({ status: 'rejeitada', rejeitada_at: new Date().toISOString() })
      .eq('id', id);
    if (e2) throw e2;

    log.info('qualidade/rejeitar-regra: regra rejeitada', { regra_id: id });
    res.json({ ok: true, regra_id: id, status: 'rejeitada' });
  } catch (err) {
    log.error('qualidade/rejeitar-regra falhou', { id, err: err.message });
    res.status(500).json({ error: err.message });
  }
});

export default router;
