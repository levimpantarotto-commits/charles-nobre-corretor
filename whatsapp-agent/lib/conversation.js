// Orquestrador da conversa: recebe mensagem do lead -> monta contexto -> chama Groq -> envia resposta.
import { chat } from './groq.js';
import { resumoCatalogo, linkImovel } from './catalogo.js';
import { getRecentMessages, findOrCreateLeadByPhone, saveMessage, touchLead } from './supabase.js';
import { sendText, resolveLidToPhone, setTyping } from './waha.js';
import { log } from './logger.js';

const CHARLES_DNA = {
  nome: process.env.CHARLES_NOME || 'Charles R. Nobre',
  creci: process.env.CHARLES_CRECI || '37177',
  whatsapp: process.env.CHARLES_WHATSAPP || '',
  regiao: process.env.CHARLES_REGIAO || 'Imbituba, Garopaba e Imaruí (SC)',
  tom: process.env.CHARLES_TOM || 'Profissional, direto, acolhedor. Trata o lead pelo nome.',
};

async function buildSystemPrompt() {
  const catalogo = await resumoCatalogo();
  return `Voce e ${CHARLES_DNA.nome}, corretor de imoveis em ${CHARLES_DNA.regiao} (CRECI ${CHARLES_DNA.creci}).
Voce esta respondendo um lead via WhatsApp.

TOM E ESTILO:
${CHARLES_DNA.tom}
- Fale como humano no WhatsApp: mensagens curtas, naturais.
- Quebre sua resposta em 2-3 mensagens curtas separadas por DUPLA QUEBRA DE LINHA (\\n\\n). NUNCA escreva tudo em um paragrafo unico.
- Cada mensagem deve ter no maximo 1-2 frases.
- Exemplos de bom estilo:
  "Oi! Tudo bem?\\n\\nVc ta procurando pra alugar ou comprar?\\n\\nE em que bairro?"
  "Boa! Imbituba tem otimas opcoes\\n\\nVc tem alguma faixa de preco em mente?"
- Em portugues brasileiro coloquial. Pode usar abreviacoes ("vc", "ta", "tb").
- Use o nome do lead se ele tiver dito.
- Nunca invente imovel que nao esta no catalogo.
- Se o lead perguntar sobre um imovel especifico, mande o link em mensagem separada: https://charlesrnobre.com.br/imovel/<id>.
- Se nao souber, oferece marcar conversa por chamada/visita.

CATALOGO ATUAL:
${catalogo}

OBJETIVO: qualificar o lead (entender o que ele procura: venda/aluguel, bairro, faixa de preco, urgencia) e mandar opcoes do catalogo que casem. Se nao houver imovel ideal, anote o interesse e prometa retorno.

REGRAS DURAS:
- Nao prometa preco abaixo do anunciado sem confirmar.
- Nao agende visita sem confirmar disponibilidade do Charles primeiro.
- Se o lead pedir pra falar com humano, responde: "Claro, em instantes o Charles te chama por aqui." e marca a conversa pra atencao manual.`;
}

export async function handleIncomingMessage(incoming) {
  let { phone, pushName, body, evolutionMessageId, mediaType } = incoming;
  const { fromIsLid } = incoming;

  // Se chegou como LID (formato Multi-Device do WhatsApp), resolve pro telefone real.
  if (fromIsLid) {
    const realPhone = await resolveLidToPhone(phone);
    if (realPhone) {
      log.info('LID resolvido', { lid: phone, phone: realPhone });
      phone = realPhone;
    } else {
      log.warn('Nao foi possivel resolver LID, usando LID como phone', { lid: phone });
    }
  }

  log.info('Mensagem recebida', { phone, pushName, body: body?.slice(0, 80) });

  // 1. Lead (cria se nao existe)
  const lead = await findOrCreateLeadByPhone(phone, { name: pushName || phone });

  // 2. Persiste a inbound
  await saveMessage({
    phone,
    direction: 'in',
    body,
    leadId: lead.id,
    evolutionMessageId,
    meta: { pushName, mediaType },
  });
  await touchLead(lead.id, { whatsapp_status: 'respondido' });

  // 3. Mensagem que pede humano? curto-circuito
  if (/humano|atendente|pessoa de verdade/i.test(body)) {
    const resposta = 'Claro, em instantes o Charles te chama por aqui.';
    return enviarResposta(phone, resposta, lead.id, { agent: true, escalate: true });
  }

  // 4. Historico recente
  const recent = await getRecentMessages(phone, 12);
  const historyForLLM = recent.map((m) => ({
    role: m.direction === 'in' ? 'user' : 'assistant',
    content: m.body,
  }));

  // 5. Chama Groq
  const system = await buildSystemPrompt();
  const userMessages = [
    { role: 'system', content: system },
    ...historyForLLM,
    // a ultima inbound ja entrou no historyForLLM acima, nao duplicar
  ];

  let resposta;
  try {
    resposta = await chat(userMessages, { temperature: 0.7, maxTokens: 500 });
  } catch (err) {
    log.error('Falha no Groq', { err: err.message });
    resposta = 'Anotei seu contato! O Charles te responde aqui em instantes.';
  }

  if (!resposta || resposta.length < 5) {
    resposta = 'Anotei sua mensagem. O Charles te chama aqui em instantes.';
  }

  return enviarResposta(phone, resposta, lead.id, { agent: true });
}

function splitInChunks(body) {
  // Quebra por dupla quebra de linha (preferido) ou por sentenca grande.
  let chunks = body.split(/\n\s*\n+/).map((c) => c.trim()).filter(Boolean);
  // Se veio em uma so e tem > 200 chars, tenta quebrar em frases.
  if (chunks.length === 1 && chunks[0].length > 200) {
    chunks = chunks[0].split(/(?<=[.?!])\s+/).map((c) => c.trim()).filter(Boolean);
  }
  return chunks.length ? chunks : [body];
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function enviarResposta(phone, body, leadId, opts = {}) {
  const chunks = splitInChunks(body);
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      // Tempo de "digitando" proporcional ao tamanho: 30ms por char, min 800ms, max 3500ms.
      const typingMs = Math.min(3500, Math.max(800, chunk.length * 30));
      await setTyping(phone, true);
      await sleep(typingMs);
      await setTyping(phone, false);

      const sent = await sendText(phone, chunk);
      await saveMessage({
        phone,
        direction: 'out',
        body: chunk,
        leadId,
        evolutionMessageId: sent?.key?.id,
        agentResponse: !!opts.agent,
        meta: opts.escalate ? { escalate_to_human: true } : {},
      });
      log.info('Resposta enviada', { phone, chunk: i + 1, of: chunks.length, len: chunk.length });
      results.push({ sent: true, body: chunk });

      // Pausa entre chunks (humano pensa antes da proxima msg).
      if (i < chunks.length - 1) await sleep(400 + Math.random() * 400);
    } catch (err) {
      log.error('Falha ao enviar chunk', { phone, chunk: i + 1, err: err.message });
      results.push({ sent: false, error: err.message });
    }
  }
  return results.length === 1 ? results[0] : { sent: true, chunks: results };
}

// Versao usada pelo broadcast / disparo manual
export async function enviarManual(phone, body, leadId) {
  return enviarResposta(phone, body, leadId, { agent: false });
}

export { linkImovel };
