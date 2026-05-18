// Cliente HTTP para WAHA (https://waha.devlike.pro/docs)
// Substitui Evolution API. WAHA Core (gratis) suporta 1 sessao chamada "default".
import axios from 'axios';
import { log } from './logger.js';

const BASE = process.env.WAHA_API_URL;
const KEY = process.env.WAHA_API_KEY;
const SESSION = process.env.WAHA_SESSION || 'default';

if (!BASE || !KEY) {
  log.warn('WAHA URL ou KEY ausente - chamadas vao falhar');
}

const http = axios.create({
  baseURL: BASE,
  headers: { 'X-Api-Key': KEY, 'Content-Type': 'application/json' },
  timeout: 30000,
});

function phoneToChatId(phone) {
  const p = String(phone || '').replace(/\D/g, '');
  return `${p}@c.us`;
}

function chatIdToPhone(chatId) {
  return String(chatId || '').replace(/@.*$/, '');
}

function isLid(chatId) {
  return String(chatId || '').endsWith('@lid');
}

// Resolve LID -> phone number real consultando o store do WAHA.
// Requer noweb.store.enabled=true na sessao.
export async function resolveLidToPhone(lid) {
  const lidNum = String(lid || '').replace(/@.*$/, '');
  if (!lidNum) return null;
  try {
    const { data } = await http.get(`/api/${SESSION}/lids/${lidNum}`);
    // Resposta esperada: { lid: "...@lid", pn: "55XXX@c.us" } ou similar
    const pn = data?.pn || data?.phoneNumber || data?.phone;
    if (pn) return chatIdToPhone(pn);
    return null;
  } catch (err) {
    log.warn('Falha resolvendo LID', { lid: lidNum, status: err.response?.status, err: err.message });
    return null;
  }
}

// --- Instancia / pareamento ---

export async function createInstance(webhookUrl) {
  const payload = {
    name: SESSION,
    config: {
      webhooks: [
        {
          url: webhookUrl,
          events: ['message', 'session.status'],
          hmac: null,
          retries: { delaySeconds: 2, attempts: 3 },
        },
      ],
    },
  };

  try {
    const { data } = await http.post('/api/sessions/start', payload);
    log.info('Sessao WAHA iniciada', { session: SESSION });
    return data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    if (err.response?.status === 422 || /already|exist/i.test(msg)) {
      log.info('Sessao WAHA ja existe, atualizando webhook', { session: SESSION });
      try {
        await http.put(`/api/sessions/${SESSION}`, payload);
      } catch (e2) {
        log.warn('Falha atualizando sessao existente', { err: e2.message });
      }
      return { exists: true };
    }
    throw err;
  }
}

export async function getQrCode() {
  const { data } = await http.get(`/api/${SESSION}/auth/qr`, {
    params: { format: 'raw' },
  });
  const code = data?.value || data?.qr || (typeof data === 'string' ? data : null);
  let base64 = null;
  try {
    const png = await http.get(`/api/${SESSION}/auth/qr`, {
      params: { format: 'image' },
      responseType: 'arraybuffer',
    });
    base64 = `data:image/png;base64,${Buffer.from(png.data).toString('base64')}`;
  } catch (e) {
    log.debug('PNG do QR indisponivel', { err: e.message });
  }
  return { code, base64, count: code ? 1 : 0 };
}

export async function getInstanceState() {
  try {
    const { data } = await http.get(`/api/sessions/${SESSION}`);
    const status = data?.status || 'UNKNOWN';
    const map = {
      WORKING: 'open',
      SCAN_QR_CODE: 'connecting',
      STARTING: 'connecting',
      STOPPED: 'close',
      FAILED: 'close',
    };
    return {
      instance: {
        instanceName: SESSION,
        state: map[status] || status.toLowerCase(),
        rawStatus: status,
      },
    };
  } catch (err) {
    if (err.response?.status === 404) {
      return { instance: { instanceName: SESSION, state: 'close' } };
    }
    throw err;
  }
}

// --- Envio ---

export async function sendText(phone, body, options = {}) {
  const payload = {
    session: SESSION,
    chatId: phoneToChatId(phone),
    text: body,
  };
  const { data } = await http.post('/api/sendText', payload);
  log.debug('Mensagem enviada', { phone, id: data?.id });
  return {
    key: { id: data?.id || data?._serialized || null, remoteJid: payload.chatId, fromMe: true },
    message: { conversation: body },
    status: 'SENT',
  };
}

export async function sendImage(phone, imageUrl, caption) {
  const payload = {
    session: SESSION,
    chatId: phoneToChatId(phone),
    file: { url: imageUrl },
    caption: caption || '',
  };
  const { data } = await http.post('/api/sendImage', payload);
  return data;
}

// --- Parse de webhook payload ---

export function parseIncomingMessage(payload) {
  // WAHA: { event: 'message', session, payload: { from, body, fromMe, id, timestamp, ... } }
  // O wa-agent recebe wrapper { event: 'messages.upsert', data: {...} } compatível com Evolution
  // Aqui adaptamos os dois formatos.
  let event = payload?.event;
  let data;

  if (event === 'message' || event === 'message.any') {
    data = payload.payload || payload.data;
  } else if (event === 'messages.upsert') {
    data = payload?.data;
  } else {
    return null;
  }

  if (!data) return null;
  if (data.fromMe === true || data.key?.fromMe === true) return null;

  const from = data.from || data.key?.remoteJid;
  const phone = chatIdToPhone(from);
  if (!phone) return null;
  const fromIsLid = isLid(from);

  let body = data.body || data.message?.conversation || data.message?.extendedTextMessage?.text || '';
  let mediaType = null;

  if (data.hasMedia || data.media) {
    mediaType = data.mimetype || data.media?.mimetype || 'unknown';
    body = data.caption || body || '[midia]';
  } else if (data.message?.imageMessage) {
    mediaType = 'image';
    body = data.message.imageMessage.caption || '[imagem]';
  } else if (data.message?.audioMessage) {
    mediaType = 'audio';
    body = '[audio]';
  } else if (data.message?.videoMessage) {
    mediaType = 'video';
    body = data.message.videoMessage.caption || '[video]';
  }

  const ts = data.timestamp || data.messageTimestamp;
  return {
    phone,
    fromIsLid,
    pushName: data.notifyName || data._data?.notifyName || data.pushName || null,
    body,
    mediaType,
    mediaUrl: null,
    evolutionMessageId: data.id || data.key?.id,
    timestamp: ts ? new Date(Number(ts) * 1000) : new Date(),
  };
}
