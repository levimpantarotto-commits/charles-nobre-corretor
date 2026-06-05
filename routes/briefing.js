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

// ─── DNA Charles — contexto injetado no prompt ───────────────────────────────
const DNA_CHARLES = `
Você é Charles R. Nobre, corretor de imóveis premium no Litoral Sul de Santa Catarina.
Sua identidade: calmo, experiente, sofisticado. Curadoria, não venda. Propósito, não m².
Região de atuação: Imbituba, Garopaba, Imaruí e entorno.
Filosofia: "O luxo não é sobre o que você possui. É sobre o que você sente ao abrir a janela."
Você entende o valor do tempo do cliente e o peso do sonho de cada família.
Seu trabalho é uma curadoria da próxima fase de vida das pessoas.
`.trim();

// ─── Coleta de métricas do dia ───────────────────────────────────────────────
async function coletarMetricas(supabase) {
  const agora = new Date();
  const inicio24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const hoje = agora.toISOString().split('T')[0];

  const [leadsRes, conversõesRes, tarefasRes, aprovacoesRes, eventosRes, imoveisRes] = await Promise.allSettled([
    supabase.from('leads').select('id, name, source, created_at').gte('created_at', inicio24h),
    supabase.from('leads').select('id').eq('status', 'convertido').gte('created_at', inicio24h),
    supabase.from('activity_log').select('id, level, message, created_at').gte('created_at', inicio24h),
    supabase.from('approvals').select('id, title, status').eq('status', 'pending'),
    supabase.from('events').select('id, title, event_type, event_time').eq('event_date', hoje),
    supabase.from('properties').select('id, title, status').eq('status', 'ativo'),
  ]);

  const safe = (res) => (res.status === 'fulfilled' ? (res.value.data ?? []) : []);

  const leads = safe(leadsRes);
  const conversoes = safe(conversõesRes);
  const logs = safe(tarefasRes);
  const aprovacoesPendentes = safe(aprovacoesRes);
  const eventosHoje = safe(eventosRes);
  const imoveisAtivos = safe(imoveisRes);

  const tarefasOk = logs.filter((l) => l.level === 'info').length;
  const tarefasFail = logs.filter((l) => l.level === 'error' || l.level === 'warn').length;

  return {
    data: hoje,
    leads: {
      total24h: leads.length,
      nomes: leads.map((l) => `${l.name} (${l.source || 'site'})`).slice(0, 10),
    },
    conversoes: conversoes.length,
    tarefas: { ok: tarefasOk, fail: tarefasFail },
    aprovacoesPendentes: aprovacoesPendentes.length,
    eventosHoje: eventosHoje.map((e) => `${e.event_time || '?'} — ${e.title} [${e.event_type}]`),
    imoveisAtivos: imoveisAtivos.length,
  };
}

// ─── Geração via Groq ────────────────────────────────────────────────────────
async function gerarBriefing() {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) throw new Error('GROQ_API_KEY não configurada');

  const supabase = getSupabase();
  const metricas = await coletarMetricas(supabase);

  const promptSistema = `${DNA_CHARLES}\n\nVocê é um assistente de inteligência que gera o briefing matinal para Charles. Responda sempre em Markdown limpo, em português brasileiro, com linguagem clara e profissional — sem exageros, sem enrolação.`;

  const promptUsuario = `
Gere o briefing matinal de ${metricas.data} com base nos dados abaixo:

**LEADS (últimas 24h):** ${metricas.leads.total24h}
${metricas.leads.nomes.length > 0 ? metricas.leads.nomes.map((n) => `- ${n}`).join('\n') : '- nenhum lead novo'}

**CONVERSÕES (últimas 24h):** ${metricas.conversoes}

**TAREFAS DO SISTEMA:**
- Executadas com sucesso: ${metricas.tarefas.ok}
- Com erro/aviso: ${metricas.tarefas.fail}

**APROVAÇÕES PENDENTES:** ${metricas.aprovacoesPendentes}

**AGENDA HOJE:**
${metricas.eventosHoje.length > 0 ? metricas.eventosHoje.map((e) => `- ${e}`).join('\n') : '- Nenhum evento agendado'}

**IMÓVEIS ATIVOS NO PORTFÓLIO:** ${metricas.imoveisAtivos}

---

Retorne um briefing em Markdown com exatamente estas seções:

## Resumo do Dia
(parágrafo curto com o panorama geral)

## 3 Destaques
(lista com os 3 pontos mais relevantes do dia)

## 3 Ações Prioritárias para Hoje
(lista com as 3 ações que Charles deve executar hoje, baseadas nos dados acima)
`.trim();

  const resposta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: promptSistema },
        { role: 'user', content: promptUsuario },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!resposta.ok) {
    const err = await resposta.text();
    throw new Error(`Groq retornou ${resposta.status}: ${err}`);
  }

  const json = await resposta.json();
  const textoMarkdown = json.choices?.[0]?.message?.content ?? '';

  // Salva na tabela briefings
  const { data: saved, error: saveError } = await supabase
    .from('briefings')
    .insert({
      conteudo: textoMarkdown,
      metricas_snapshot: metricas,
      gerado_em: new Date().toISOString(),
    })
    .select()
    .single();

  if (saveError) {
    console.warn('[briefing] Erro ao salvar no banco:', saveError.message);
  }

  return saved ?? { conteudo: textoMarkdown, metricas_snapshot: metricas, gerado_em: new Date().toISOString() };
}

// ─── Cron 07:00 diário ───────────────────────────────────────────────────────
function agendarCron() {
  try {
    const cron = require('node-cron');
    cron.schedule('0 7 * * *', async () => {
      console.log('[briefing] Gerando briefing matinal automático...');
      try {
        const resultado = await gerarBriefing();
        console.log(`[briefing] Briefing gerado com sucesso (id: ${resultado.id ?? 'sem-id'})`);
      } catch (err) {
        console.error('[briefing] Falha no cron:', err.message);
      }
    }, { timezone: 'America/Sao_Paulo' });
    console.log('[briefing] Cron 07:00 agendado (America/Sao_Paulo)');
  } catch {
    console.warn('[briefing] node-cron não disponível — cron matinal não agendado');
  }
}

agendarCron();

// ─── Endpoints ───────────────────────────────────────────────────────────────

// GET /api/briefing — último briefing gerado
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('briefings')
      .select('*')
      .order('gerado_em', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Nenhum briefing encontrado. Use POST /api/briefing/agora para gerar.' });
    }
    if (error) return res.status(500).json({ error: error.message });

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/briefing/historico?limit=10
router.get('/historico', async (req, res) => {
  try {
    const supabase = getSupabase();
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const { data, error } = await supabase
      .from('briefings')
      .select('id, gerado_em, metricas_snapshot, conteudo')
      .order('gerado_em', { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });

    return res.json(data ?? []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/briefing/agora — gera briefing imediatamente
router.post('/agora', async (req, res) => {
  try {
    const resultado = await gerarBriefing();
    return res.status(201).json(resultado);
  } catch (err) {
    console.error('[briefing] Erro ao gerar briefing manual:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = { router, gerarBriefing };
