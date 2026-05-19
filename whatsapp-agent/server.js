// WhatsApp Agentic Server - Charles Nobre
// Roda no Coolify, conecta com Evolution API + Supabase + Groq.
import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { persistIncoming, processBatch, enviarManual } from './lib/conversation.js';
import { parseIncomingMessage, parseOutgoingMessage, createInstance, deleteInstance, getQrCode, getInstanceState, sendText } from './lib/waha.js';
import { supabase, normalizePhone, touchLead, setPauseUntil, findOrCreateLeadByPhone, saveMessage } from './lib/supabase.js';
import { coalesceIncoming } from './lib/coalescer.js';
import { syncLeadsFromSheets } from './lib/sync-leads.js';
import { runBroadcast } from './lib/broadcast.js';
import { notifyFollowupAprovacao, notifyAdmin } from './lib/telegram.js';
import { log } from './lib/logger.js';

dotenv.config();

const PORT = parseInt(process.env.PORT, 10) || 3030;
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN;

const app = express();
app.use(express.json({ limit: '5mb' }));

function timingSafeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Middleware de auth pra rotas administrativas
function requireToken(req, res, next) {
  const provided = req.headers['x-webhook-token'] || req.query.token;
  if (!WEBHOOK_TOKEN) return res.status(503).json({ error: 'WEBHOOK_TOKEN nao configurado' });
  if (!provided || !timingSafeEqual(provided, WEBHOOK_TOKEN)) {
    return res.status(401).json({ error: 'Token invalido' });
  }
  next();
}

// --- HEALTH ---
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.get('/status', requireToken, async (_req, res) => {
  try {
    const state = await getInstanceState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PAREAMENTO (chamado 1x no setup) ---
app.post('/setup/create-instance', requireToken, async (req, res) => {
  try {
    const webhookUrl = `${req.protocol}://${req.get('host')}/webhook/evolution?token=${WEBHOOK_TOKEN}`;
    const result = await createInstance(webhookUrl);
    res.json({ ok: true, result, webhook: webhookUrl });
  } catch (err) {
    log.error('Falha criando instancia', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post('/setup/reset-instance', requireToken, async (req, res) => {
  try {
    await deleteInstance();
    const webhookUrl = `${req.protocol}://${req.get('host')}/webhook/evolution?token=${WEBHOOK_TOKEN}`;
    const result = await createInstance(webhookUrl);
    res.json({ ok: true, reset: true, result, webhook: webhookUrl });
  } catch (err) {
    log.error('Falha resetando instancia', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get('/setup/qr', requireToken, async (_req, res) => {
  try {
    const qr = await getQrCode();
    res.json(qr);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- WEBHOOK DA EVOLUTION ---
app.post('/webhook/evolution', async (req, res) => {
  const provided = req.query.token;
  if (!WEBHOOK_TOKEN || !provided || !timingSafeEqual(provided, WEBHOOK_TOKEN)) {
    return res.status(401).json({ error: 'Token invalido' });
  }

  // ACK imediato pra Evolution nao retransmitir
  res.json({ ok: true });

  const payload = req.body;
  const event = payload?.event;
  log.debug('Webhook recebido', { event });

  // WAHA: 'message' | 'message.any'  |  Evolution legacy: 'messages.upsert'
  if (event !== 'message' && event !== 'message.any' && event !== 'messages.upsert') return;

  // ANTES de tentar inbound: detecta fromMe (Charles assumiu manual do celular).
  // Pausa IA pra esse lead por PAUSE_AFTER_HANDOFF_MIN (default 30). NAO pausa
  // se a mensagem foi enviada pela propria IA (skip se ja existe no banco com
  // agent_response=true — checado por evolutionMessageId pra evitar loop).
  const outgoing = parseOutgoingMessage(payload);
  if (outgoing) {
    const pauseMin = parseInt(process.env.PAUSE_AFTER_HANDOFF_MIN, 10) || 30;
    (async () => {
      try {
        // Filtra eco da propria IA: se essa msg ja foi gravada por nos, ignora.
        if (outgoing.evolutionMessageId) {
          const { data: ja } = await supabase
            .from('whatsapp_messages')
            .select('id, agent_response')
            .eq('evolution_message_id', outgoing.evolutionMessageId)
            .limit(1);
          if (ja && ja.length > 0) {
            log.debug('Outbound do webhook ja gravado (eco da IA)', { id: outgoing.evolutionMessageId });
            return;
          }
        }
        const lead = await findOrCreateLeadByPhone(outgoing.phone, { name: outgoing.phone });
        await saveMessage({
          phone: outgoing.phone,
          direction: 'out',
          body: outgoing.body || '[msg do Charles]',
          leadId: lead.id,
          evolutionMessageId: outgoing.evolutionMessageId,
          agentResponse: false,
          meta: { manual_handoff: true },
        });
        await setPauseUntil(lead.id, pauseMin);
        log.info('Charles assumiu manual — IA pausada', {
          phone: outgoing.phone, leadId: lead.id, minutos: pauseMin,
        });
      } catch (err) {
        log.error('Falha tratando fromMe', { err: err.message, phone: outgoing.phone });
      }
    })();
    return; // nao processa como inbound
  }

  const parsed = parseIncomingMessage(payload);
  if (!parsed) return;

  // 1. Persiste inbound imediato (resolve LID, salva no banco) — nao depende do debounce.
  // 2. Empilha no coalescer; quando expirar o timer, processa batch agrupado.
  persistIncoming(parsed)
    .then((enriched) => coalesceIncoming(enriched.phone, enriched, processBatch))
    .catch((err) => {
      log.error('Falha processando inbound', { phone: parsed.phone, err: err.message, stack: err.stack });
    });
});

// --- SYNC LEADS DA GOOGLE SHEETS (puxa planilha -> Supabase) ---
app.post('/admin/sync-sheets', requireToken, async (_req, res) => {
  try {
    const result = await syncLeadsFromSheets();
    res.json({ ok: true, ...result });
  } catch (err) {
    log.error('Falha no sync-sheets', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// --- CONVERSAS (lista mensagens recentes pra monitorar) ---
// GET /admin/conversas?since=<minutes>&limit=<N>&direction=in|out
app.get('/admin/conversas', requireToken, async (req, res) => {
  try {
    const sinceMin = parseInt(req.query.since, 10) || 30;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const direction = req.query.direction; // opcional: 'in' ou 'out'
    const cutoff = new Date(Date.now() - sinceMin * 60_000).toISOString();

    let q = supabase
      .from('whatsapp_messages')
      .select('id, phone, direction, body, created_at, agent_response, meta, lead_id')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (direction === 'in' || direction === 'out') q = q.eq('direction', direction);

    const { data: msgs, error } = await q;
    if (error) throw error;

    // Enriquece com nome do lead em uma chamada
    const leadIds = [...new Set((msgs || []).map((m) => m.lead_id).filter(Boolean))];
    let leadsById = {};
    if (leadIds.length) {
      const { data: leads } = await supabase.from('leads').select('id, name').in('id', leadIds);
      leadsById = Object.fromEntries((leads || []).map((l) => [l.id, l.name]));
    }
    const enriched = (msgs || []).map((m) => ({
      ...m,
      name: leadsById[m.lead_id] || null,
    }));
    res.json({ ok: true, sinceMin, count: enriched.length, msgs: enriched });
  } catch (err) {
    log.error('Falha listando conversas', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// --- NAO-RESPONDIDOS (leads que receberam broadcast mas nao deram sinal de vida) ---
// GET /admin/nao-respondidos?horas=48
app.get('/admin/nao-respondidos', requireToken, async (req, res) => {
  try {
    const horas = Math.max(1, parseInt(req.query.horas, 10) || 48);
    const cutoff = new Date(Date.now() - horas * 3600_000).toISOString();
    const { data, error } = await supabase
      .from('leads_with_last_message')
      .select('id, name, phone, whatsapp_status, last_whatsapp_at, last_message_body, last_message_direction, last_message_at, message_count, notes')
      .eq('whatsapp_status', 'enviado')
      .lt('last_whatsapp_at', cutoff)
      .order('last_whatsapp_at', { ascending: true })
      .limit(500);
    if (error) throw error;

    // Enriquece com dias parados pra triagem rapida
    const agora = Date.now();
    const enriched = (data || []).map((l) => ({
      ...l,
      horas_parado: l.last_whatsapp_at
        ? Math.floor((agora - new Date(l.last_whatsapp_at).getTime()) / 3600_000)
        : null,
    }));
    res.json({ ok: true, horas, cutoff, count: enriched.length, leads: enriched });
  } catch (err) {
    log.error('Falha listando nao-respondidos', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// --- FOLLOW-UP COLD LEAD (preview pra aprovacao) ---
// GET /admin/followup-preview?diasMin=7&diasMax=14
// Lista leads que receberam broadcast nessa janela e nunca responderam.
async function listarColdLeads(diasMin = 7, diasMax = 14) {
  const agora = Date.now();
  const inicio = new Date(agora - diasMax * 86_400_000).toISOString();
  const fim = new Date(agora - diasMin * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('leads_with_last_message')
    .select('id, name, phone, whatsapp_status, last_whatsapp_at, last_message_direction, message_count, notes')
    .eq('whatsapp_status', 'enviado')
    .gte('last_whatsapp_at', inicio)
    .lt('last_whatsapp_at', fim)
    .order('last_whatsapp_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data || []).map((l) => ({
    ...l,
    horas_parado: l.last_whatsapp_at
      ? Math.floor((agora - new Date(l.last_whatsapp_at).getTime()) / 3600_000)
      : null,
  }));
}

app.get('/admin/followup-preview', requireToken, async (req, res) => {
  try {
    const diasMin = Math.max(1, parseInt(req.query.diasMin, 10) || 7);
    const diasMax = Math.max(diasMin + 1, parseInt(req.query.diasMax, 10) || 14);
    const leads = await listarColdLeads(diasMin, diasMax);
    res.json({ ok: true, diasMin, diasMax, count: leads.length, leads });
  } catch (err) {
    log.error('Falha follow-up preview', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/followup-disparar  body: { leadIds: [...], template?: string, dryRun?: bool }
// Dispara mensagem de reativacao SO pros leadIds aprovados (vindos do preview).
// Marca whatsapp_status='followup_enviado' depois. Respeita cooldown 12h.
const DEFAULT_FOLLOWUP_TEMPLATE =
  process.env.FOLLOWUP_TEMPLATE ||
  `Oi {nome}, aqui e o Charles. Surgiram novas opcoes alinhadas ao seu perfil em Imbituba/Garopaba. Posso te enviar pra voce dar uma olhada?`;

app.post('/admin/followup-disparar', requireToken, async (req, res) => {
  try {
    const { leadIds = [], template = DEFAULT_FOLLOWUP_TEMPLATE, dryRun = false, delayMs } = req.body || {};
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds: array nao vazio obrigatorio' });
    }
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, name, phone, whatsapp_status')
      .in('id', leadIds);
    if (error) throw error;

    if (dryRun) {
      return res.json({
        dryRun: true,
        count: leads.length,
        preview: leads.map((l) => ({
          id: l.id, name: l.name, phone: l.phone,
          msg: template.replace(/\{nome\}/g, (l.name || '').trim().split(/\s+/)[0] || 'tudo bem'),
        })),
      });
    }

    const espera = parseInt(delayMs, 10) || parseInt(process.env.BROADCAST_DELAY_MS, 10) || 4000;
    let ok = 0, fail = 0, skip = 0;
    const erros = [];
    for (let i = 0; i < leads.length; i++) {
      const l = leads[i];
      const primeiroNome = (l.name || '').trim().split(/\s+/)[0] || 'tudo bem';
      const body = template.replace(/\{nome\}/g, primeiroNome);
      try {
        const result = await enviarManual(l.phone, body, l.id);
        if (result?.skipped) { skip++; continue; }
        await touchLead(l.id, { whatsapp_status: 'enviado' }); // reseta janela pro cron nao re-pegar
        ok++;
      } catch (err) {
        fail++;
        erros.push({ id: l.id, phone: l.phone, err: err.message });
      }
      if (i < leads.length - 1) await new Promise((r) => setTimeout(r, espera));
    }
    res.json({ ok: true, total: leads.length, enviados: ok, falhas: fail, cooldownSkip: skip, erros });
  } catch (err) {
    log.error('Falha follow-up disparar', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// --- BROADCAST (manda mensagem pros leads pendentes) ---
// Body opcional: { dryRun, limit, skipNames: [], template }
app.post('/admin/broadcast', requireToken, async (req, res) => {
  try {
    const opts = req.body || {};
    const result = await runBroadcast(opts);
    res.json({ ok: true, ...result });
  } catch (err) {
    log.error('Falha no broadcast', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// --- ENVIO MANUAL (pra dashboard /admin disparar mensagens) ---
app.post('/send', requireToken, async (req, res) => {
  const { phone, text, leadId } = req.body || {};
  if (!phone || !text) {
    return res.status(400).json({ error: 'phone e text obrigatorios' });
  }
  const normalized = normalizePhone(phone);
  if (!normalized) return res.status(400).json({ error: 'phone invalido' });

  try {
    const result = await enviarManual(normalized, text, leadId);
    res.json(result);
  } catch (err) {
    log.error('Falha no envio manual', { phone, err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// --- TESTE/PING (envia mensagem teste) ---
app.post('/send/test', requireToken, async (req, res) => {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone obrigatorio' });
  const normalized = normalizePhone(phone);
  try {
    const result = await sendText(normalized, '[teste] WhatsApp Agentic Charles online.');
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ERROR HANDLER ---
app.use((err, _req, res, _next) => {
  log.error('Unhandled error', { err: err.message, stack: err.stack });
  res.status(500).json({ error: 'Erro interno' });
});

app.listen(PORT, () => {
  log.info(`WhatsApp Agentic Charles online`, {
    port: PORT,
    instance: process.env.EVOLUTION_INSTANCE_NAME,
    groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  });

  // Cron interno de follow-up cold lead. Roda 1x/dia (default), notifica
  // Telegram com lista pra aprovacao MANUAL — nao dispara nada automaticamente
  // (regra do Levi: cron prepara, humano aprova).
  // Desativar setando FOLLOWUP_CRON_ENABLED=false.
  if (process.env.FOLLOWUP_CRON_ENABLED !== 'false') {
    const intervalMs = parseInt(process.env.FOLLOWUP_CRON_INTERVAL_MS, 10) || 24 * 3600_000;
    setInterval(async () => {
      try {
        const leads = await listarColdLeads(
          parseInt(process.env.FOLLOWUP_DIAS_MIN, 10) || 7,
          parseInt(process.env.FOLLOWUP_DIAS_MAX, 10) || 14,
        );
        if (leads.length > 0) {
          await notifyFollowupAprovacao(leads);
          log.info('Cron follow-up enviou preview pra aprovacao', { count: leads.length });
        } else {
          log.debug('Cron follow-up: nenhum lead na janela');
        }
      } catch (err) {
        log.error('Cron follow-up falhou', { err: err.message });
        notifyAdmin(`Cron follow-up falhou: ${err.message}`).catch(() => {});
      }
    }, intervalMs);
    log.info('Cron follow-up cold lead ativo', { intervalH: intervalMs / 3600_000 });
  }
});
