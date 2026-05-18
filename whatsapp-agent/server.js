// WhatsApp Agentic Server - Charles Nobre
// Roda no Coolify, conecta com Evolution API + Supabase + Groq.
import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { persistIncoming, processBatch, enviarManual } from './lib/conversation.js';
import { parseIncomingMessage, createInstance, getQrCode, getInstanceState, sendText } from './lib/waha.js';
import { normalizePhone } from './lib/supabase.js';
import { coalesceIncoming } from './lib/coalescer.js';
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
});
