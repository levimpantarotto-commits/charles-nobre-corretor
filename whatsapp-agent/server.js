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
  //    Pula coalescer se persistIncoming detectou duplicata (deduped:true).
  persistIncoming(parsed)
    .then((enriched) => {
      if (enriched?.deduped) return; // duplicata ignorada
      return coalesceIncoming(enriched.phone, enriched, processBatch);
    })
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

// --- LEADS DUPLICADOS (mesmo phone normalizado em rows diferentes) ---
// GET /admin/leads-duplicados
// Replica o PASSO 1 da migration_002 sem precisar SQL — listagem read-only.
app.get('/admin/leads-duplicados', requireToken, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, name, phone, whatsapp_status, created_at')
      .not('phone', 'is', null)
      .order('created_at', { ascending: true })
      .limit(5000);
    if (error) throw error;

    // Normaliza phone (so digitos) e agrupa
    const grupos = new Map();
    for (const l of data || []) {
      const norm = (l.phone || '').replace(/\D/g, '');
      if (!norm) continue;
      if (!grupos.has(norm)) grupos.set(norm, []);
      grupos.get(norm).push(l);
    }
    const dups = [];
    for (const [phoneNorm, leads] of grupos.entries()) {
      if (leads.length > 1) {
        dups.push({
          phone_normalizado: phoneNorm,
          qtd: leads.length,
          mantido: leads[0], // mais antigo (created_at asc)
          duplicatas: leads.slice(1),
        });
      }
    }
    dups.sort((a, b) => b.qtd - a.qtd);

    res.json({
      ok: true,
      total_leads: data?.length || 0,
      total_grupos_com_dup: dups.length,
      total_rows_extras: dups.reduce((acc, g) => acc + g.qtd - 1, 0),
      grupos: dups,
    });
  } catch (err) {
    log.error('Falha listando duplicados', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// --- LEAD INDIVIDUAL (triagem + opt_out manual) ---
// GET /admin/lead/:id  -> dados do lead + ultimas N msgs
app.get('/admin/lead/:id', requireToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: lead, error: e1 } = await supabase
      .from('leads').select('*').eq('id', id).single();
    if (e1) throw e1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 200);
    const { data: msgs } = await supabase
      .from('whatsapp_messages')
      .select('id, direction, body, agent_response, created_at, meta')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);
    res.json({ ok: true, lead, messages: (msgs || []).reverse() });
  } catch (err) {
    log.error('Falha buscando lead', { err: err.message });
    res.status(404).json({ error: err.message });
  }
});

// POST /admin/lead/:id/opt-out  -> marca whatsapp_status='opt_out' (IA nao
// responde mais, broadcast/follow-up pulam). Idempotente.
app.post('/admin/lead/:id/opt-out', requireToken, async (req, res) => {
  try {
    const { id } = req.params;
    const motivo = req.body?.motivo || 'manual';
    const { data: cur } = await supabase
      .from('leads').select('whatsapp_session').eq('id', id).single();
    const session = { ...(cur?.whatsapp_session || {}), opt_out_motivo: motivo, opt_out_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('leads')
      .update({ whatsapp_status: 'opt_out', whatsapp_session: session })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    log.info('Lead marcado opt_out', { id, motivo });
    res.json({ ok: true, lead: data });
  } catch (err) {
    log.error('Falha opt-out', { err: err.message });
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

// --- FOLLOW-UP (preview pra aprovacao MANUAL — 2 cadencias: warm e cold) ---
//
// WARM: leads que receberam broadcast ha 24-48h e nao responderam. Aborda
//       "ainda quente" — IA fala "viu minha msg ontem? alguma duvida?".
// COLD: leads que receberam ha 7-14 dias. Aborda "novidade" — "surgiram
//       opcoes novas pro seu perfil, posso enviar?".
//
// Janela em HORAS pra flexibilidade. Defaults: WARM 24-48, COLD 168-336.
async function listarLeadsSemResposta(horasMin, horasMax) {
  const agora = Date.now();
  const inicio = new Date(agora - horasMax * 3600_000).toISOString();
  const fim = new Date(agora - horasMin * 3600_000).toISOString();
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

// Wrappers legados — mantem compat com endpoints anteriores
async function listarColdLeads(diasMin = 7, diasMax = 14) {
  return listarLeadsSemResposta(diasMin * 24, diasMax * 24);
}
async function listarWarmLeads(horasMin = 24, horasMax = 48) {
  return listarLeadsSemResposta(horasMin, horasMax);
}

// GET /admin/followup-preview?cadencia=warm|cold  (ou horasMin/horasMax)
app.get('/admin/followup-preview', requireToken, async (req, res) => {
  try {
    const cad = (req.query.cadencia || '').toLowerCase();
    let horasMin, horasMax;
    if (cad === 'warm') {
      horasMin = parseInt(process.env.FOLLOWUP_WARM_H_MIN, 10) || 24;
      horasMax = parseInt(process.env.FOLLOWUP_WARM_H_MAX, 10) || 48;
    } else if (cad === 'cold' || cad === '') {
      const dMin = parseInt(req.query.diasMin, 10) || parseInt(process.env.FOLLOWUP_DIAS_MIN, 10) || 7;
      const dMax = parseInt(req.query.diasMax, 10) || parseInt(process.env.FOLLOWUP_DIAS_MAX, 10) || 14;
      horasMin = dMin * 24;
      horasMax = dMax * 24;
    } else {
      // override manual em horas
      horasMin = parseInt(req.query.horasMin, 10);
      horasMax = parseInt(req.query.horasMax, 10);
    }
    if (!horasMin || !horasMax || horasMax <= horasMin) {
      return res.status(400).json({ error: 'horasMin/horasMax invalidos' });
    }
    const leads = await listarLeadsSemResposta(horasMin, horasMax);
    res.json({ ok: true, cadencia: cad || 'cold', horasMin, horasMax, count: leads.length, leads });
  } catch (err) {
    log.error('Falha follow-up preview', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/followup-disparar  body: { leadIds: [...], template?: string, dryRun?: bool }
// Dispara mensagem de reativacao SO pros leadIds aprovados (vindos do preview).
// Marca whatsapp_status='followup_enviado' depois. Respeita cooldown 12h.
const DEFAULT_FOLLOWUP_COLD_TEMPLATE =
  process.env.FOLLOWUP_TEMPLATE ||
  `Oi {nome}, aqui e o Charles. Surgiram novas opcoes alinhadas ao seu perfil em Imbituba/Garopaba. Posso te enviar pra voce dar uma olhada?`;
const DEFAULT_FOLLOWUP_WARM_TEMPLATE =
  process.env.FOLLOWUP_WARM_TEMPLATE ||
  `Oi {nome}, voce viu minha mensagem ontem? Alguma duvida sobre o imovel?`;

app.post('/admin/followup-disparar', requireToken, async (req, res) => {
  try {
    const { leadIds = [], cadencia = 'cold', dryRun = false, delayMs } = req.body || {};
    const template = req.body?.template
      || (cadencia === 'warm' ? DEFAULT_FOLLOWUP_WARM_TEMPLATE : DEFAULT_FOLLOWUP_COLD_TEMPLATE);
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

  // Crons internos de follow-up. Cada cron coleta candidatos da sua janela
  // e notifica Telegram com lista pra aprovacao MANUAL (regra Levi: cron
  // prepara, humano aprova). Nao dispara nada automatico.
  // Desativar global: FOLLOWUP_CRON_ENABLED=false.
  if (process.env.FOLLOWUP_CRON_ENABLED !== 'false') {
    const intervalMs = parseInt(process.env.FOLLOWUP_CRON_INTERVAL_MS, 10) || 24 * 3600_000;

    // Cron COLD (1x/dia default — leads parados 7-14 dias)
    setInterval(async () => {
      try {
        const leads = await listarColdLeads(
          parseInt(process.env.FOLLOWUP_DIAS_MIN, 10) || 7,
          parseInt(process.env.FOLLOWUP_DIAS_MAX, 10) || 14,
        );
        if (leads.length > 0) {
          await notifyFollowupAprovacao(leads.map((l) => ({ ...l, cadencia: 'cold' })));
          log.info('Cron follow-up COLD preview', { count: leads.length });
        }
      } catch (err) {
        log.error('Cron COLD falhou', { err: err.message });
        notifyAdmin(`Cron follow-up COLD falhou: ${err.message}`).catch(() => {});
      }
    }, intervalMs);

    // Cron WARM (1x/dia default — leads parados 24-48h, ainda quentes)
    const warmIntervalMs = parseInt(process.env.FOLLOWUP_WARM_CRON_INTERVAL_MS, 10) || intervalMs;
    setInterval(async () => {
      try {
        const leads = await listarWarmLeads(
          parseInt(process.env.FOLLOWUP_WARM_H_MIN, 10) || 24,
          parseInt(process.env.FOLLOWUP_WARM_H_MAX, 10) || 48,
        );
        if (leads.length > 0) {
          await notifyFollowupAprovacao(leads.map((l) => ({ ...l, cadencia: 'warm' })));
          log.info('Cron follow-up WARM preview', { count: leads.length });
        }
      } catch (err) {
        log.error('Cron WARM falhou', { err: err.message });
        notifyAdmin(`Cron follow-up WARM falhou: ${err.message}`).catch(() => {});
      }
    }, warmIntervalMs);

    log.info('Crons follow-up ativos', {
      coldIntervalH: intervalMs / 3600_000,
      warmIntervalH: warmIntervalMs / 3600_000,
    });
  }
});
