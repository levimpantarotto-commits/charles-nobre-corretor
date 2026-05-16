// Orquestrador da conversa: recebe mensagem do lead -> monta contexto -> chama Groq -> envia resposta.
import { chat } from './groq.js';
import { resumoCatalogo, linkImovel } from './catalogo.js';
import { getRecentMessages, findOrCreateLeadByPhone, saveMessage, touchLead } from './supabase.js';
import { sendText } from './evolution.js';
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
- Respostas curtas e objetivas (max 3-4 frases por mensagem).
- Em portugues brasileiro coloquial.
- Use o nome do lead se ele tiver dito.
- Nunca invente imovel que nao esta no catalogo.
- Se o lead perguntar sobre um imovel especifico, mande o link: https://charlesrnobre.com.br/imovel/<id>.
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
  const { phone, pushName, body, evolutionMessageId, mediaType } = incoming;

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

async function enviarResposta(phone, body, leadId, opts = {}) {
  try {
    const sent = await sendText(phone, body, { delay: 1500 });
    await saveMessage({
      phone,
      direction: 'out',
      body,
      leadId,
      evolutionMessageId: sent?.key?.id,
      agentResponse: !!opts.agent,
      meta: opts.escalate ? { escalate_to_human: true } : {},
    });
    log.info('Resposta enviada', { phone, len: body.length });
    return { sent: true, body };
  } catch (err) {
    log.error('Falha ao enviar resposta', { phone, err: err.message });
    return { sent: false, error: err.message };
  }
}

// Versao usada pelo broadcast / disparo manual
export async function enviarManual(phone, body, leadId) {
  return enviarResposta(phone, body, leadId, { agent: false });
}

export { linkImovel };
