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
  // LID do WhatsApp Multi-Device tem 14+ digitos. Usar @lid pra rotear via
  // chat thread (em vez de @c.us que assume phone real e dropa LID).
  if (p.length >= 14) return `${p}@lid`;
  return `${p}@c.us`;
}

function chatIdToPhone(chatId) {
  return String(chatId || '').replace(/@.*$/, '');
}

function isLid(chatId) {
  return String(chatId || '').endsWith('@lid');
}

// Resolve LID -> phone real. WAHA noweb tem variantes de endpoint conforme versao
// e nem sempre tem o LID mapeado se a sessao foi recem-pareada (store nao sincronizou).
// Tenta endpoints diretos primeiro, fallback pra busca em /contacts/all.
let _contactsCache = { ts: 0, data: null };

async function getAllContactsCached() {
  if (_contactsCache.data && Date.now() - _contactsCache.ts < 60_000) return _contactsCache.data;
  try {
    const { data } = await http.get(`/api/${SESSION}/contacts/all`);
    const list = Array.isArray(data) ? data : (data?.contacts || []);
    _contactsCache = { ts: Date.now(), data: list };
    return list;
  } catch (err) {
    log.debug('Falha listando contacts/all', { err: err.message, status: err.response?.status });
    return [];
  }
}

export async function resolveLidToPhone(lid) {
  if (!lid) return null;
  const lidNum = String(lid).replace(/@.*$/, '');
  if (!lidNum) return null;

  // 1. Endpoints diretos — variantes conhecidas
  const tentativas = [
    `/api/${SESSION}/lids/${lidNum}`,
    `/api/${SESSION}/lids/${encodeURIComponent(`${lidNum}@lid`)}`,
    `/api/contacts/lid-pn?lid=${encodeURIComponent(`${lidNum}@lid`)}&session=${SESSION}`,
  ];
  for (const path of tentativas) {
    try {
      const { data } = await http.get(path);
      const pn = data?.pn || data?.phoneNumber || data?.phone || data?.id;
      if (pn) {
        const phone = chatIdToPhone(pn);
        if (phone && phone !== lidNum) {
          log.info('LID resolvido', { via: path, lid: lidNum, phone });
          return phone;
        }
      }
    } catch (err) {
      // segue pra proxima tentativa
    }
  }

  // 2. Fallback: lista todos contatos e procura pelo LID
  const contatos = await getAllContactsCached();
  for (const c of contatos) {
    const cLid = (c.lid || '').replace(/@.*$/, '');
    if (cLid && cLid === lidNum) {
      const phone = chatIdToPhone(c.id || c.number || c.pn || '');
      if (phone && phone !== lidNum) {
        log.info('LID resolvido via contacts/all', { lid: lidNum, phone });
        return phone;
      }
    }
  }

  log.warn('LID nao resolvido em nenhuma fonte', { lid: lidNum, tentativas: tentativas.length });
  return null;
}

// --- Instancia / pareamento ---

export async function createInstance(webhookUrl) {
  const payload = {
    name: SESSION,
    config: {
      // noweb.store ESSENCIAL pra resolver LID -> phone real.
      // Sem isso TODOS endpoints /contacts/* + /lids/* retornam 400/404.
      // full_sync popula o store com historico de contatos no pareamento.
      noweb: {
        store: { enabled: true, fullSync: true },
      },
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

export async function deleteInstance() {
  try {
    try {
      await http.post(`/api/sessions/${SESSION}/stop`);
    } catch (e) {
      log.debug('Erro ao parar sessao para delecao (normal)', { err: e.message });
    }
    const { data } = await http.delete(`/api/sessions/${SESSION}`);
    log.info('Sessao WAHA deletada com sucesso', { session: SESSION });
    return data;
  } catch (err) {
    log.error('Falha ao deletar sessao WAHA', { session: SESSION, err: err.message });
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

// --- Validacao de numero ---

// Confere se o phone existe no WhatsApp ANTES de mandar.
// WAHA: GET /api/contacts/check-exists?phone=PHONE&session=SESSION
// Resposta: { numberExists: bool, chatId: "55...@c.us" }
// Returns: { exists: bool, chatId: string|null, phone: string }
export async function checkNumberExists(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return { exists: false, chatId: null, phone: digits };
  try {
    const { data } = await http.get('/api/contacts/check-exists', {
      params: { phone: digits, session: SESSION },
    });
    return {
      exists: !!data?.numberExists,
      chatId: data?.chatId || null,
      phone: digits,
    };
  } catch (err) {
    log.warn('check-exists falhou', { phone: digits, err: err.message, status: err.response?.status });
    // Em caso de erro do WAHA, assume que existe (melhor mandar que perder lead real)
    return { exists: true, chatId: null, phone: digits, error: err.message };
  }
}

// Tenta variantes de phone BR pra cobrir o "9 extra" do celular novo vs antigo.
// Phone com 13 digitos (55+DDD+9+8d) -> tenta sem o 9 (12 digitos).
// Phone com 12 digitos -> tenta com o 9 inserido.
// Retorna o phone que existe, ou null se nenhum bate.
export async function resolveBrPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return { phone: null, exists: false };

  // Tenta original primeiro
  const r1 = await checkNumberExists(digits);
  if (r1.exists) return { phone: digits, exists: true, source: 'original' };

  // Variantes BR: 55 + DDD (2) + [9] + 8 digitos = 13 com 9, 12 sem
  if (digits.startsWith('55') && digits.length === 13 && digits[4] === '9') {
    // Tira o 9: 5548999340790 -> 554899340790
    const semNove = digits.slice(0, 4) + digits.slice(5);
    const r2 = await checkNumberExists(semNove);
    if (r2.exists) return { phone: semNove, exists: true, source: 'sem_9' };
  } else if (digits.startsWith('55') && digits.length === 12) {
    // Insere 9: 554899340790 -> 5548999340790
    const comNove = digits.slice(0, 4) + '9' + digits.slice(4);
    const r2 = await checkNumberExists(comNove);
    if (r2.exists) return { phone: comNove, exists: true, source: 'com_9' };
  }

  return { phone: digits, exists: false, source: null };
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

export async function setTyping(phone, on = true) {
  try {
    await http.post(`/api/${SESSION}/presence`, {
      chatId: phoneToChatId(phone),
      presence: on ? 'typing' : 'paused',
    });
  } catch (err) {
    log.debug('Falha setTyping', { err: err.message });
  }
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
  let mediaUrl = null;
  let mediaMimetype = null;

  if (data.hasMedia || data.media) {
    mediaMimetype = data.mimetype || data.media?.mimetype || null;
    mediaType = mediaMimetype || 'unknown';
    mediaUrl = data.media?.url || data.mediaUrl || null;
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
  // Tenta varios campos onde WAHA noweb / Evolution legacy podem por o nome.
  // notifyName e o campo canonico do WAHA noweb, mas as vezes vem null se o
  // lead nao esta nos contatos do dispositivo conectado. Loga debug-1-shot
  // quando nao acha nada, pra calibrar pra outros payloads no futuro.
  const pushName =
    data.notifyName ||
    data._data?.notifyName ||
    data.pushName ||
    data.chat?.name ||
    data.contact?.name ||
    data._chat?.name ||
    data.senderName ||
    null;

  if (!pushName) {
    if (!_loggedMissingName) {
      _loggedMissingName = true;
      log.warn('pushName ausente — payload bruto pra calibracao', {
        keys: Object.keys(data),
        sample: JSON.stringify(data).slice(0, 800),
      });
    }
  }

  return {
    phone,
    fromIsLid,
    pushName,
    body,
    mediaType,
    mediaUrl,
    mediaMimetype,
    evolutionMessageId: data.id || data.key?.id,
    timestamp: ts ? new Date(Number(ts) * 1000) : new Date(),
  };
}

// flag pra logar payload SEM nome apenas 1x (calibracao, nao spam).
let _loggedMissingName = false;

// Variante que captura SO outbound (fromMe=true) — Charles digitando do celular.
// Usado pelo handler de pausa: quando Charles assume manual, suspendemos a IA
// pra esse lead por X minutos. Nao confundir com a IA enviando via sendText
// (essa nao chega pelo webhook como nova msg, vai pelo OUR-OWN-MESSAGE event).
export function parseOutgoingMessage(payload) {
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
  const isFromMe = data.fromMe === true || data.key?.fromMe === true;
  if (!isFromMe) return null;

  // O destinatario fica em `to` ou em `key.remoteJid` (o "outro lado" do chat).
  const to = data.to || data.key?.remoteJid;
  const phone = chatIdToPhone(to);
  if (!phone) return null;

  const body =
    data.body || data.message?.conversation || data.message?.extendedTextMessage?.text || '';
  const id = data.id || data.key?.id || '';

  return { phone, body, evolutionMessageId: id, fromIsLid: isLid(to) };
}

// Baixa media direto pelo URL retornado no webhook.
// WAHA noweb manda URL interna do proprio container (http://localhost:3000/...)
// que nao funciona de fora — reescreve pra WAHA_API_URL configurado.
function rewriteMediaUrl(url) {
  if (!url || !BASE) return url;
  try {
    const u = new URL(url);
    const internalHosts = ['localhost', '127.0.0.1', '0.0.0.0', 'host.docker.internal'];
    if (internalHosts.includes(u.hostname)) {
      const base = BASE.replace(/\/+$/, '');
      const newUrl = `${base}${u.pathname}${u.search}`;
      return newUrl;
    }
    return url;
  } catch {
    return url;
  }
}

export async function downloadMediaFromUrl(url, mimetypeHint) {
  if (!url) return null;
  const fetchUrl = rewriteMediaUrl(url);
  try {
    const resp = await http.get(fetchUrl, { responseType: 'arraybuffer', timeout: 20000 });
    const buffer = Buffer.from(resp.data);
    const mimetype = resp.headers?.['content-type'] || mimetypeHint || 'application/octet-stream';
    log.debug('Media baixada', { fetchUrl, bytes: buffer.length, mimetype });
    return { buffer, mimetype };
  } catch (err) {
    log.warn('Falha baixando media', {
      originalUrl: url,
      fetchUrl,
      err: err.message,
      status: err.response?.status,
    });
    return null;
  }
}
