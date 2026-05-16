// Cliente HTTP pra Evolution API (https://doc.evolution-api.com/v2)
// Pareamento via QR code, envio/recebimento de mensagens, webhook.
import axios from 'axios';
import { log } from './logger.js';

const BASE = process.env.EVOLUTION_API_URL;
const KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME;

if (!BASE || !KEY) {
  log.warn('Evolution API URL ou KEY ausente — chamadas vao falhar');
}

const http = axios.create({
  baseURL: BASE,
  headers: { apikey: KEY, 'Content-Type': 'application/json' },
  timeout: 30000,
});

// --- Instancia / pareamento ---

export async function createInstance(webhookUrl) {
  // Cria a instancia se nao existir e ja configura o webhook
  try {
    const { data } = await http.post('/instance/create', {
      instanceName: INSTANCE,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: webhookUrl,
        webhook_by_events: false,
        webhook_base64: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'MESSAGES_UPDATE'],
      },
    });
    log.info('Instancia Evolution criada', { instance: INSTANCE });
    return data;
  } catch (err) {
    if (err.response?.status === 409 || err.response?.data?.response?.message?.[0]?.includes('already in use')) {
      log.info('Instancia ja existe', { instance: INSTANCE });
      return { exists: true };
    }
    throw err;
  }
}

export async function getQrCode() {
  const { data } = await http.get(`/instance/connect/${INSTANCE}`);
  return data; // { code, qrcode: { base64, ... } }
}

export async function getInstanceState() {
  const { data } = await http.get(`/instance/connectionState/${INSTANCE}`);
  return data; // { instance: { state: 'open'|'connecting'|'close' } }
}

// --- Envio ---

export async function sendText(phone, body, options = {}) {
  // phone: E.164 sem + (ex: "5548999459527")
  const payload = {
    number: phone,
    text: body,
    delay: options.delay || 1200, // ms de "digitando..." antes de enviar
  };
  if (options.quoted) payload.quoted = options.quoted;

  const { data } = await http.post(`/message/sendText/${INSTANCE}`, payload);
  log.debug('Mensagem enviada', { phone, id: data?.key?.id });
  return data;
}

export async function sendImage(phone, imageUrl, caption) {
  const { data } = await http.post(`/message/sendMedia/${INSTANCE}`, {
    number: phone,
    mediatype: 'image',
    media: imageUrl,
    caption: caption || '',
  });
  return data;
}

// --- Parse de webhook payload (MESSAGES_UPSERT) ---

export function parseIncomingMessage(payload) {
  // Estrutura tipica: { event: 'messages.upsert', data: { key, message, pushName, ... } }
  const data = payload?.data;
  if (!data?.key || data.key.fromMe) return null;

  const phone = data.key.remoteJid?.replace(/@.*$/, '');
  if (!phone) return null;

  const msg = data.message || {};
  let body = msg.conversation || msg.extendedTextMessage?.text || '';
  let mediaUrl = null;
  let mediaType = null;

  if (msg.imageMessage) {
    mediaType = 'image';
    body = msg.imageMessage.caption || '[imagem]';
  } else if (msg.audioMessage) {
    mediaType = 'audio';
    body = '[audio]';
  } else if (msg.videoMessage) {
    mediaType = 'video';
    body = msg.videoMessage.caption || '[video]';
  } else if (msg.documentMessage) {
    mediaType = 'document';
    body = msg.documentMessage.title || msg.documentMessage.fileName || '[documento]';
  }

  return {
    phone,
    pushName: data.pushName || null,
    body,
    mediaType,
    mediaUrl,
    evolutionMessageId: data.key.id,
    timestamp: data.messageTimestamp ? new Date(data.messageTimestamp * 1000) : new Date(),
  };
}
