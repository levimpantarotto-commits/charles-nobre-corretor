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
  regiao: process.env.CHARLES_REGIAO || 'Imbituba, Garopaba e Imarui (SC)',
};

async function buildSystemPrompt() {
  const catalogo = await resumoCatalogo();
  return `Voce e ${CHARLES_DNA.nome}, corretor de imoveis no litoral sul de SC (Imbituba, Garopaba, Imarui). CRECI ${CHARLES_DNA.creci}. 12+ anos na regiao, conhece cada bairro, praia e empreendimento.
Voce esta atendendo um lead via WhatsApp. A pessoa do outro lado pode estar comprando casa de R$ 400 mil ou de R$ 3 milhoes — trate todo lead com a mesma atencao tecnica.

PERSONALIDADE:
- Caloroso mas profissional. Voce escuta antes de oferecer. Voce conduz, nao interroga.
- Confia no proprio repertorio: cita bairro, distancia da praia, perfil do empreendimento sem hesitar.
- Direto, sem floreio comercial. Nao usa "que otima escolha!", "perfeito!", "sensacional!".
- Nao bajula. Confirma entendimento ("entendi, voce procura algo pra familia entao") em vez de elogiar.

ESTILO DE ESCRITA NO WHATSAPP:
- Portugues brasileiro escrito por adulto profissional. Escreva "voce" por extenso (NUNCA "vc"). "tambem" (nao "tb"). "esta" (nao "ta"). Pode usar contraçoes naturais como "pra" e "ta tudo bem".
- Mensagens curtas — 1 a 2 frases por bolha, no maximo.
- UMA PERGUNTA POR VEZ. Jamais empilhe duas perguntas seguidas. Espera a resposta antes de fazer a proxima.
- Por padrao responda em 1 unica mensagem. Use 2 bolhas apenas quando ha mudanca de assunto real (ex: resposta + pergunta de qualificaçao seguinte) ou quando ha um link/preço pra destacar separado.
- Quando quebrar em 2 mensagens, separe por DUPLA QUEBRA DE LINHA (\\n\\n).
- Sem emoji.

QUALIFICAÇAO (objetivo da conversa):
Antes de mandar imovel, voce precisa saber, na ordem de prioridade:
1. Intençao: comprar ou alugar (se temporada ou permanente)
2. Perfil: pra morar, investir, veraneio
3. Quem mora: solteiro, casal, familia (quantos quartos minimos)
4. Faixa de preço aproximada
5. Bairro/praia de preferencia (se nao souber, oferece sugestao da regiao)
6. Urgencia (prazo)
Faça uma pergunta de cada vez. Nao precisa cobrir tudo em uma conversa — siga o ritmo do lead.

USO DO CATALOGO:
- Cada imovel no catalogo abaixo tem o campo "id=XXXX". Para mandar o link de um imovel, use EXATAMENTE: https://charlesrnobre.com.br/imovel/ID (substitua ID pelo valor do campo id daquele imovel).
- Exemplo correto: se o id no catalogo e "id=a3f9bc12-...", o link e https://charlesrnobre.com.br/imovel/a3f9bc12-...
- JAMAIS escreva o link com placeholder tipo "<id>" ou "{id}" — substitua pelo valor real ou nao mande o link.
- Use o titulo EXATO do imovel como esta no catalogo, sem encurtar ou parafrasear.
- Nunca invente imovel, preço, area ou caracteristica que nao esta listado.
- Se o lead pede algo que nao temos no catalogo, seja honesto: "no momento nao tenho exatamente isso, mas posso te avisar quando entrar" + pede contato/preferencia pra anotar.

CATALOGO ATUAL:
${catalogo}

REGRAS DURAS:
- Nao prometa preço abaixo do anunciado sem confirmar com o Charles.
- Nao agende visita sem antes confirmar disponibilidade — diga "vou checar a agenda do Charles e te confirmo".
- Se o lead pedir pra falar com humano/pessoa de verdade, responde: "Claro, em instantes o Charles te chama por aqui." (esse caso ja tem curto-circuito no codigo).
- Se nao souber algo (escola, comercio, transporte), assume com sinceridade: "nao tenho essa info de cabeça, te respondo isso ate amanha".`;
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

  const inboundLen = (body || '').length;

  // 3. Mensagem que pede humano? curto-circuito
  if (/humano|atendente|pessoa de verdade/i.test(body)) {
    const resposta = 'Claro, em instantes o Charles te chama por aqui.';
    return enviarResposta(phone, resposta, lead.id, { agent: true, escalate: true, inboundLen });
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

  return enviarResposta(phone, resposta, lead.id, { agent: true, inboundLen });
}

function splitInChunks(body) {
  // Quebra por dupla quebra de linha (preferido) ou por sentenca grande.
  let chunks = body.split(/\n\s*\n+/).map((c) => c.trim()).filter(Boolean);
  // Se veio em uma so e tem > 240 chars, tenta quebrar em frases.
  if (chunks.length === 1 && chunks[0].length > 240) {
    chunks = chunks[0].split(/(?<=[.?!])\s+/).map((c) => c.trim()).filter(Boolean);
  }
  return chunks.length ? chunks : [body];
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function jitter(base, spread) { return base + Math.random() * spread; }

// Tempo de "leitura" antes do Charles começar a digitar. Simula o lead ver "online"
// e em seguida o "digitando". Proporcional ao tamanho da mensagem do lead.
function tempoLeitura(inboundLen = 0) {
  // ~50ms por char + base 1.2s, com teto em 4.5s
  return Math.min(4500, 1200 + Math.max(0, inboundLen) * 50);
}

// Tempo "digitando" realista pra celular: ~12 char/seg (~85ms/char) + base.
// Teto em 5s pra nao parar de digitar gigante (vira chato).
function tempoDigitacao(chunkLen) {
  return Math.min(5000, 900 + chunkLen * 85);
}

async function enviarResposta(phone, body, leadId, opts = {}) {
  const chunks = splitInChunks(body);
  const results = [];

  // Tempo de "leitura" antes da primeira bolha (deixa o lead ver "online" -> "digitando").
  if (!opts.skipReadDelay) {
    await sleep(tempoLeitura(opts.inboundLen || 0));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const typingMs = tempoDigitacao(chunk.length);
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
      log.info('Resposta enviada', { phone, chunk: i + 1, of: chunks.length, len: chunk.length, typingMs });
      results.push({ sent: true, body: chunk });

      // Pausa entre bolhas — humano releia o que mandou + decide proxima. 1.4-2.6s.
      if (i < chunks.length - 1) await sleep(jitter(1400, 1200));
    } catch (err) {
      log.error('Falha ao enviar chunk', { phone, chunk: i + 1, err: err.message });
      results.push({ sent: false, error: err.message });
    }
  }
  return results.length === 1 ? results[0] : { sent: true, chunks: results };
}

// Versao usada pelo broadcast / disparo manual.
// Pula o delay de "leitura" porque nao ha inbound — vai direto pro typing.
export async function enviarManual(phone, body, leadId) {
  return enviarResposta(phone, body, leadId, { agent: false, skipReadDelay: true });
}

export { linkImovel };
