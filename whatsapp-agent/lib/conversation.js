// Orquestrador da conversa: recebe mensagem do lead -> monta contexto -> chama Groq -> envia resposta.
import { chat } from './groq.js';
import { resumoCatalogo, linkImovel, imovelPorId, formatarImovelDestaque } from './catalogo.js';
import { getRecentMessages, findOrCreateLeadByPhone, saveMessage, touchLead } from './supabase.js';
import { sendText, resolveLidToPhone, setTyping, downloadMediaFromUrl } from './waha.js';
import { transcribeAudio } from './transcribe.js';
import { log } from './logger.js';

const CHARLES_DNA = {
  nome: process.env.CHARLES_NOME || 'Charles R. Nobre',
  creci: process.env.CHARLES_CRECI || '37177',
  whatsapp: process.env.CHARLES_WHATSAPP || '',
  regiao: process.env.CHARLES_REGIAO || 'Imbituba, Garopaba e Imarui (SC)',
};

async function buildSystemPrompt() {
  const catalogo = await resumoCatalogo();

  // Imovel do anuncio atual (Meta Ads). Quando setado, IA abre direto nele.
  const promotedId = process.env.BROADCAST_PROMOTED_PROPERTY_ID || '';
  let destaque = null;
  if (promotedId) {
    const p = await imovelPorId(promotedId.trim());
    destaque = formatarImovelDestaque(p);
  }

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

${destaque ? `IMOVEL DO ANUNCIO ATUAL (CONTEXTO IMPORTANTE):
Estes leads chegaram por um anuncio Meta Ads especifico deste imovel:
${destaque}

REGRA: este e o foco da conversa. Voce JA SABE que o lead se interessou por este imovel especifico em Imbituba. NAO pergunte bairro, regiao ou tipo (apto/casa) — ja esta resolvido. Confirme interesse, manda o link em mensagem separada, e qualifica em volta dele (financiamento, entrada, prazo, quantos quartos minimo). So oferece outro imovel se o lead recusar este explicitamente ou pedir outra coisa.

` : ''}QUALIFICAÇAO (objetivo da conversa):
${destaque ? `Como o lead veio do anuncio acima, foque em:
1. Confirmar interesse no imovel
2. Forma de pagamento (a vista, financiamento, FGTS)
3. Tem entrada disponivel? quanto?
4. Urgencia / prazo pra decidir
5. Quem mora (familia, criancas) — so se ainda nao ficou claro
Manda 1 pergunta de cada vez. Nao despeja varias perguntas.` : `Antes de mandar imovel, voce precisa saber, na ordem de prioridade:
1. Intençao: comprar ou alugar (se temporada ou permanente)
2. Perfil: pra morar, investir, veraneio
3. Quem mora: solteiro, casal, familia (quantos quartos minimos)
4. Faixa de preço aproximada
5. Bairro/praia de preferencia (se nao souber, oferece sugestao da regiao)
6. Urgencia (prazo)
Faça uma pergunta de cada vez. Nao precisa cobrir tudo em uma conversa — siga o ritmo do lead.`}

USO DO CATALOGO:
- Cada imovel no catalogo abaixo tem o campo "id=XXXX". Para mandar o link de um imovel, use EXATAMENTE: https://www.charlesrnobre.com.br/imoveis/ID (substitua ID pelo valor do campo id daquele imovel). Note: a URL e "imoveis" no plural, com "www." na frente.
- Exemplo correto: se o id no catalogo e "id=a3f9bc12-...", o link e https://www.charlesrnobre.com.br/imoveis/a3f9bc12-...
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
- Se nao souber algo (escola, comercio, transporte), assume com sinceridade: "nao tenho essa info de cabeça, te respondo isso ate amanha".

REGRAS DE HONESTIDADE (CRITICO):
- Voce e um ASSISTENTE DIGITAL do Charles. Se o lead perguntar "voce e uma IA?" / "isso e bot?" / "robo?" / "automatico?", responde: "Sou o assistente digital do Charles. Ele acompanha a conversa e entra quando precisar." NUNCA negue que e IA/assistente. NUNCA diga "sou humano" ou "sou o Charles em pessoa".
- NUNCA invente bairros, regioes, imoveis, precos ou caracteristicas. Se o lead manda algo confuso ou ambiguo (ex: so um nome, so uma palavra, "ok", "rosa", "amarelo"), NAO interprete como localizacao ou caracteristica. Pergunte de volta: "Desculpa, nao entendi — pode me explicar?". Pra nomes (ex: "Giovane Rosa"), assuma que e nome proprio e nao tente decodificar como bairro.
- Se o lead se identificar como proprietario, anunciante, jornalista, concorrente, ou disser que esta "so testando", responda educadamente: "Entendi, agradeco o contato. Qualquer coisa que precisar de imovel na regiao, estou por aqui." E nao continue qualificando.`;
}

// Etapa 1: chamada do webhook assim que chega inbound.
// Resolve LID, transcreve audio (se houver), cria/atualiza lead, persiste no banco.
// Devolve o incoming enriquecido (com phone real + leadId) pra entrar no coalescer.
export async function persistIncoming(incoming) {
  let { phone, pushName, body, evolutionMessageId, mediaType, mediaUrl, mediaMimetype } = incoming;
  const { fromIsLid } = incoming;

  if (fromIsLid) {
    const realPhone = await resolveLidToPhone(phone);
    if (realPhone) {
      log.info('LID resolvido', { lid: phone, phone: realPhone });
      phone = realPhone;
    } else {
      log.warn('Nao foi possivel resolver LID, usando LID como phone', { lid: phone });
    }
  }

  // Se for audio (PTT do WhatsApp = ogg/opus), tenta transcrever pra Groq Whisper
  // antes de salvar. Se rolar, body persistido vira o texto — historico, coalescer
  // e LLM passam a ver a fala como texto normal.
  const looksAudio = mediaType && /^audio\//i.test(mediaType);
  let transcribed = false;
  if (looksAudio && mediaUrl) {
    try {
      const media = await downloadMediaFromUrl(mediaUrl, mediaMimetype);
      if (media?.buffer) {
        const texto = await transcribeAudio(media.buffer, media.mimetype);
        if (texto) {
          body = texto;
          transcribed = true;
          log.info('Audio transcrito', { phone, chars: texto.length, preview: texto.slice(0, 80) });
        }
      }
    } catch (err) {
      log.warn('Falha transcrevendo audio', { phone, err: err.message });
      body = body || '[audio - falha na transcricao]';
    }
  } else if (looksAudio && !mediaUrl) {
    log.warn('Audio recebido sem mediaUrl no payload — verificar config STORE_MEDIA do WAHA', { phone });
  }

  log.info('Inbound recebido', { phone, pushName, mediaType, transcribed, body: body?.slice(0, 80) });

  const lead = await findOrCreateLeadByPhone(phone, { name: pushName || phone });
  await saveMessage({
    phone,
    direction: 'in',
    body,
    leadId: lead.id,
    evolutionMessageId,
    meta: { pushName, mediaType, transcribed },
  });
  // Toca last_whatsapp_at sem mexer no status — status valido so vira 'respondido'
  // apos processBatch enviar resposta. (CHECK constraint: pendente|enviado|respondido|opt_out)
  await touchLead(lead.id);

  return { ...incoming, phone, leadId: lead.id };
}

// Etapa 2: chamada pelo coalescer apos o debounce expirar.
// Recebe 1+ inbounds agrupados, monta resposta unica considerando o batch.
export async function processBatch(batch) {
  if (!batch || batch.length === 0) return null;

  const last = batch[batch.length - 1];
  const { phone, leadId } = last;

  // Concatena bodies do batch em ordem cronologica pra raciocinar como "tudo que o lead disse agora".
  const combinedBody = batch
    .map((m) => (m.body || '').trim())
    .filter(Boolean)
    .join('\n');
  const inboundLen = combinedBody.length;

  log.info('Processando batch', { phone, msgs: batch.length, combinedLen: inboundLen });

  // Curto-circuito: pedido de humano. Status fica 'respondido' (schema atual nao tem
  // 'escalado'); a flag escalate_to_human ja vai na meta da message via opts.escalate.
  if (/humano|atendente|pessoa de verdade/i.test(combinedBody)) {
    return enviarResposta(phone, 'Claro, em instantes o Charles te chama por aqui.', leadId, {
      agent: true, escalate: true, inboundLen,
    });
  }

  // Historico ja contem as inbounds que persistIncoming salvou.
  const recent = await getRecentMessages(phone, 16);
  const historyForLLM = recent.map((m) => ({
    role: m.direction === 'in' ? 'user' : 'assistant',
    content: m.body,
  }));

  const system = await buildSystemPrompt();
  const messages = [{ role: 'system', content: system }, ...historyForLLM];

  let resposta;
  try {
    resposta = await chat(messages, { temperature: 0.7, maxTokens: 500 });
  } catch (err) {
    log.error('Falha no Groq', { err: err.message });
    resposta = 'Anotei seu contato! O Charles te responde aqui em instantes.';
  }

  if (!resposta || resposta.length < 5) {
    resposta = 'Anotei sua mensagem. O Charles te chama aqui em instantes.';
  }

  await touchLead(leadId, { whatsapp_status: 'respondido' });
  return enviarResposta(phone, resposta, leadId, { agent: true, inboundLen });
}

function splitInChunks(body) {
  // SO quebra se a IA explicitamente usou DUPLA QUEBRA DE LINHA (intencional).
  // NAO quebra por sentenca — antes quebrava demais (4 bolhas pra "Sou Charles. Tenho
  // 12 anos. Estou aqui. Voce procura?") e ficava insuportavel pro lead.
  const chunks = body.split(/\n\s*\n+/).map((c) => c.trim()).filter(Boolean);
  return chunks.length ? chunks : [body];
}

// Detecta se um "phone" no banco e na verdade um LID nao-resolvido.
// LID do WhatsApp tem 14+ digitos. Phone BR valido tem 12 ou 13.
function pareceLid(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 14;
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
  // LID nao-resolvido agora roteia via phoneToChatId('<lid>@lid') no waha.js,
  // entao nao bloqueamos mais. Apenas registramos no log pra rastreio.
  if (pareceLid(phone)) {
    log.info('Enviando via LID (phone nao resolvido)', { phone, leadId });
  }

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
