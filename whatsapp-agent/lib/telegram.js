// Notificacoes via Telegram Bot API.
// DORMENTE se TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID nao estao setados —
// apenas loga 1x no boot e silencia chamadas. Sem ruido, sem throw.
import axios from 'axios';
import { log } from './logger.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const ENABLED = !!(TOKEN && CHAT_ID);

let _warnedOnce = false;
function warnDormant() {
  if (!_warnedOnce) {
    log.warn('Telegram dormente — defina TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID pra ativar notificacoes');
    _warnedOnce = true;
  }
}

async function sendRaw(text, opts = {}) {
  if (!ENABLED) {
    warnDormant();
    return { skipped: true };
  }
  try {
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    const { data } = await axios.post(url, {
      chat_id: CHAT_ID,
      text,
      parse_mode: opts.parseMode || 'Markdown',
      disable_web_page_preview: true,
    }, { timeout: 10000 });
    return { ok: true, messageId: data?.result?.message_id };
  } catch (err) {
    log.warn('Falha enviando Telegram', {
      err: err.message,
      status: err.response?.status,
      body: err.response?.data?.description,
    });
    return { ok: false, error: err.message };
  }
}

// --- Helpers de notificacao com formato consistente ---

export async function notifyNovosLeads(novos) {
  if (!novos || novos.length === 0) return { skipped: true };
  const linhas = novos.slice(0, 20).map((l) => `• *${l.name}* — \`${l.phone}\``);
  const sobra = novos.length > 20 ? `\n_+${novos.length - 20} outros_` : '';
  const texto = `*Charles — ${novos.length} lead${novos.length > 1 ? 's' : ''} novo${novos.length > 1 ? 's' : ''} na planilha*\n${linhas.join('\n')}${sobra}`;
  return sendRaw(texto);
}

export async function notifyNovoRespondedor(lead, body) {
  const preview = (body || '').slice(0, 140);
  const nome = lead.name || lead.phone;
  const texto = `*Charles — lead respondeu pela 1ª vez*\n*${nome}* — \`${lead.phone}\`\n_"${preview}"_`;
  return sendRaw(texto);
}

export async function notifyLeadQualificou(lead, resumo) {
  const nome = lead.name || lead.phone;
  let texto = `*Charles — lead QUALIFICOU*\n*${nome}* — \`${lead.phone}\``;
  if (resumo && typeof resumo === 'object') {
    const linhas = Object.entries(resumo)
      .filter(([, v]) => v)
      .map(([k, v]) => `• ${k}: ${v}`);
    if (linhas.length) texto += `\n${linhas.join('\n')}`;
  }
  return sendRaw(texto);
}

export async function notifyFollowupAprovacao(leads) {
  if (!leads || leads.length === 0) return { skipped: true };
  const linhas = leads.slice(0, 15).map((l) =>
    `• *${l.name || l.phone}* — \`${l.phone}\` (${l.horas_parado || '?'}h)`
  );
  const sobra = leads.length > 15 ? `\n_+${leads.length - 15} outros_` : '';
  const texto = `*Charles — follow-up sugerido (${leads.length} cold leads)*\nLeads 7-14 dias sem responder:\n${linhas.join('\n')}${sobra}\n\n_Aprove via:_ \`POST /admin/followup-disparar\``;
  return sendRaw(texto);
}

export async function notifyAdmin(texto) {
  return sendRaw(`*Charles — admin*\n${texto}`);
}

export { ENABLED as telegramEnabled };
