// Orquestrador da conversa: recebe mensagem do lead -> monta contexto -> chama Groq -> envia resposta.
import { chat } from './groq.js';
import { resumoCatalogo, linkImovel, imovelPorId, formatarImovelDestaque } from './catalogo.js';
import { supabase, getRecentMessages, findOrCreateLeadByPhone, saveMessage, touchLead, getPauseState } from './supabase.js';
import { sendText, resolveLidToPhone, setTyping, downloadMediaFromUrl } from './waha.js';
import { transcribeAudio } from './transcribe.js';
import { notifyNovoRespondedor, notifyLeadQualificou } from './telegram.js';
import { writeQualificationToSheet } from './sheets.js';
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

  return `Voce e o ASSISTENTE DIGITAL do ${CHARLES_DNA.nome}, corretor em Imbituba/Garopaba/Imarui (SC, CRECI ${CHARLES_DNA.creci}).
Seu unico papel: FILTRAR o lead — coletar informacao basica e entregar pro Charles fechar. Voce NAO fecha venda, NAO agenda, NAO negocia. Voce qualifica e passa adiante.

ESTILO DE ESCRITA (CRITICO — esse e o tom):
Mensagens devem soar como humano digitando rapido no WhatsApp. Curto, com conector natural antes da pergunta. NUNCA robotico, NUNCA formulario.

EXEMPLOS BONS (siga esse estilo):
"Mas esta interessado no imovel?"
"Entendi. Pra comprar ou alugar?"
"Boa. Pra voce morar entao?"
"E quantos quartos voce precisa?"
"Certo. Tem ideia de valor?"
"Entendi, e em quanto tempo voce pretende decidir?"

EXEMPLOS RUINS (NUNCA assim):
- Robotico/seco: "Comprar ou alugar?" (sem conector, soa formulario)
- Narrando: "Entendi, voce procura algo no centro para morar sem depender de carro..."
- Paragrafo: 3+ linhas explicando contexto
- 2 perguntas: "Comprar ou alugar? E quantos quartos?"

REGRAS DE ESCRITA:
- Maximo 15 palavras por mensagem.
- Comece com um conector natural curto quando fizer sentido: "Entendi.", "Boa.", "Certo.", "Ok.", "Show.", "E ...". Da fluidez sem narrar.
- NUNCA comece com "Entendi, voce procura X..." parafraseando o lead — robotico ao contrario.
- NUNCA faça 2 perguntas na mesma resposta.
- Portugues coloquial profissional. "voce" por extenso (NUNCA "vc"). "esta" (nao "ta"). "pra" e ok. Sem emoji.
- Sem floreio comercial: nada de "Otimo!", "Perfeito!", "Que legal!".

${destaque ? `IMOVEL DO ANUNCIO:
${destaque}

O lead chegou por anuncio deste imovel especifico. NAO pergunte bairro/regiao/tipo — ja sabemos.

` : ''}PIPELINE DE QUALIFICAÇAO (faça nesta ordem, UMA por turno):
1. Confirmar interesse no imovel (a primeira mensagem ja perguntou isso)
2. Comprar ou alugar?
3. Pra voce morar, investir ou veraneio?
4. Quantos quartos voce precisa, no minimo?
5. Forma de pagamento — a vista, financiamento ou FGTS?
6. Em quanto tempo voce pretende decidir/se mudar?

COMO OPERAR A PIPELINE (REGRA CRITICA — leia com atençao):
Antes de gerar a resposta, FAÇA esta verificaçao mental sobre TODO o historico:

  - Ponto 2 (comprar/alugar): o lead em algum momento disse comprar, alugar, financiar, locaçao, locar, locataria, FGTS? Se sim -> CHECADO.
  - Ponto 3 (perfil): disse morar, residir, familia, investir, veraneio, ferias, locar, ja moro em? Se sim -> CHECADO.
  - Ponto 4 (quartos): mencionou numero de quartos, dormitorios, suite, dois, tres? Se sim -> CHECADO.
  - Ponto 5 (pagamento): disse valor, faixa, financiar, a vista, FGTS, entrada, R$, mil? Se sim -> CHECADO.
  - Ponto 6 (prazo): disse logo, urgente, mes que vem, depois, ainda nao sei, vou pensar? Se sim -> CHECADO.

So pergunte o PROXIMO ponto que NAO esta checado. NUNCA repita pergunta cuja resposta ja esta no historico — mesmo que tenha vindo fora de ordem ou como resposta a outra coisa.

EXEMPLOS de leitura correta:
- Lead disse "vou alugar até vender o meu" -> 2=alugar CHECADO + tambem 3=morar (subentendido) CHECADO. Proximo = 4 (quartos).
- Lead disse "moro hoje no Mirante, preciso voltar pro centro" -> 3=morar CHECADO. Proximo = 2 (comprar/alugar) se nao foi dito.
- Lead disse "quero alugar 2 quartos por 2 mil" -> 2 + 4 + 5 CHECADOS de uma vez. Proximo = 3 ou 6.
- Lead disse so "sim" depois de voce confirmar interesse -> nada checado alem do ponto 1. Proximo = 2.

Se 5+ dos 6 pontos checados, envia filtro pronto:
"Otimo, vou repassar tudo pro Charles e ele te chama por aqui em instantes pra dar os proximos passos."
E pare. Filtro encerrado.

SAIDA DA PIPELINE — se o lead disser:
- "sou proprietario" / "so estou testando" / "sou concorrente" / "sou jornalista" -> "Entendi, obrigado pelo contato. Qualquer imovel que precisar na regiao, estou por aqui." E pare.
- "quero falar com humano" / "atendente" / "pessoa de verdade" -> "Claro, em instantes o Charles te chama por aqui." (codigo ja trata)
- "voce e uma IA?" / "bot?" / "robo?" -> "Sou o assistente digital do Charles. Ele acompanha e entra quando precisar." NUNCA negue. Depois retoma a proxima pergunta da pipeline.
- Linguagem ofensiva -> "Prefiro nao continuar nesse tom. Se precisar de imovel na regiao, estou por aqui." E pare.

ANTI-ALUCINAÇAO:
- So fale com autoridade de imoveis listados no CATALOGO abaixo. Pra qualquer outro nome (bairro, condominio, lugar) que o lead mencionar, voce nao sabe nada — apenas acolha ("entendi, voce conhece o Villa Bela entao") e siga com a proxima pergunta da pipeline. NUNCA descreva nada que nao esteja no catalogo.
- Se o lead manda algo confuso (uma palavra solta, nome proprio, "ok"), pergunte de volta: "Desculpa, nao entendi — pode me explicar?".
- Nunca invente preço, area, caracteristicas, distancias.

USO DO CATALOGO:
- Link de imovel: https://www.charlesrnobre.com.br/imoveis/ID (plural, com www). Substitua ID pelo valor real do campo id. JAMAIS escreva placeholder <id> ou {id}.
- Use o titulo EXATO do imovel como esta no catalogo.

CATALOGO ATUAL:
${catalogo}`;
}

// Etapa 1: chamada do webhook assim que chega inbound.
// Resolve LID, transcreve audio (se houver), cria/atualiza lead, persiste no banco.
// Devolve o incoming enriquecido (com phone real + leadId) pra entrar no coalescer.
//
// DEDUP DEFENSIVO: WAHA tem `retries: { attempts: 3 }` no webhook config —
// se o handler demorar pra responder, pode retransmitir e cair duas vezes
// aqui. Unique constraint em evolution_message_id ja pega quando o ID e
// estavel, mas WAHA noweb as vezes manda IDs diferentes pra retry. Guard
// adicional: ignora se mesmo (phone, body) chegou nos ultimos INBOUND_DEDUP_S.
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

  // Dedup defensivo: ignora inbound se identico chegou nos ultimos N segundos.
  const dedupS = parseFloat(process.env.INBOUND_DEDUP_S || '5');
  if (dedupS > 0 && body) {
    const cutoff = new Date(Date.now() - dedupS * 1000).toISOString();
    const { data: recente } = await supabase
      .from('whatsapp_messages')
      .select('id, created_at')
      .eq('phone', phone)
      .eq('direction', 'in')
      .eq('body', body)
      .gte('created_at', cutoff)
      .limit(1);
    if (recente && recente.length > 0) {
      log.warn('Inbound duplicado ignorado (dedup defensivo)', {
        phone, body: body.slice(0, 60), windowS: dedupS, original: recente[0].id,
      });
      // Retorna sem leadId pra sinalizar que nao deve entrar no coalescer.
      return { ...incoming, phone, leadId: null, deduped: true };
    }
  }

  const lead = await findOrCreateLeadByPhone(phone, { name: pushName || phone });
  await saveMessage({
    phone,
    direction: 'in',
    body,
    leadId: lead.id,
    evolutionMessageId,
    meta: { pushName, mediaType, transcribed },
  });

  // Marca 'respondido' assim que o lead da sinal de vida (independe de a IA
  // conseguir responder). Sobe de pendente/enviado -> respondido; nao mexe em
  // opt_out. Lead recem-criado ja vem com 'respondido' do findOrCreateLeadByPhone.
  const eraPrimeiroInbound = lead.whatsapp_status === 'pendente' || lead.whatsapp_status === 'enviado';
  const patch = { last_whatsapp_at: new Date().toISOString() };
  if (eraPrimeiroInbound) patch.whatsapp_status = 'respondido';
  await touchLead(lead.id, patch);

  // Notifica Charles via Telegram no PRIMEIRO inbound (transicao enviado/pendente -> respondido)
  if (eraPrimeiroInbound) {
    notifyNovoRespondedor({ name: lead.name, phone }, body).catch((e) =>
      log.debug('Telegram notify falhou', { err: e.message })
    );
  }

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

  // OPT_OUT: lead foi marcado pra IA NAO responder (proprietario, em conversa
  // com Charles humano, incidente). Curto-circuito antes de qualquer custo.
  const { data: leadCheck } = await supabase
    .from('leads').select('whatsapp_status').eq('id', leadId).single();
  if (leadCheck?.whatsapp_status === 'opt_out') {
    log.info('Lead em opt_out — IA nao responde', { phone, leadId });
    return { sent: false, skipped: true, reason: 'opt_out' };
  }

  // PAUSA: se Charles assumiu manual recentemente, NAO chama IA. Lead recebe
  // resposta humana do Charles via celular, nao precisa do agente concorrer.
  const pause = await getPauseState(leadId);
  if (pause.paused) {
    log.info('Lead em pausa (Charles assumiu manual) — IA nao responde', {
      phone, leadId, until: pause.until,
    });
    return { sent: false, skipped: true, reason: 'paused', until: pause.until };
  }

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
    resposta = await chat(messages, { temperature: 0.65, maxTokens: 300 });
  } catch (err) {
    log.error('Falha no Groq', { err: err.message });
    resposta = 'Anotei seu contato! O Charles te responde aqui em instantes.';
  }

  if (!resposta || resposta.length < 5) {
    resposta = 'Anotei sua mensagem. O Charles te chama aqui em instantes.';
  }

  // Detecta qualificacao: se a IA disparou o gatilho de "vou repassar pro Charles",
  // o lead bateu 5/6 pontos. Calcula score, persiste resumo na session, notifica
  // Telegram e sincroniza de volta no Google Sheets (se configurado).
  if (indicaQualificacao(resposta)) {
    const historicoTexto = recent.map((m) => m.body).join(' ');
    const resumo = resumirPipeline(historicoTexto);
    const score = calcularScore(resumo);
    const qualificacao = { resumo, score, qualified_at: new Date().toISOString() };

    // Persiste no banco (merge em whatsapp_session)
    (async () => {
      try {
        const { data: cur } = await supabase
          .from('leads').select('whatsapp_session, name').eq('id', leadId).single();
        const session = { ...(cur?.whatsapp_session || {}), qualificacao };
        await supabase.from('leads').update({ whatsapp_session: session }).eq('id', leadId);
        await notifyLeadQualificou({ name: cur?.name, phone }, { ...resumo, score: `${score}/10` });
        // Sheets sync bidirecional (dormente sem env)
        writeQualificationToSheet(phone, resumo, score).catch((e) =>
          log.debug('Sheets write qualificacao falhou', { err: e.message })
        );
      } catch (e) {
        log.warn('Falha persistindo qualificacao', { err: e.message });
      }
    })();
  }

  // 'respondido' ja foi marcado no persistIncoming. Aqui so toca last_whatsapp_at
  // implicitamente via saveMessage do outbound.
  return enviarResposta(phone, resposta, leadId, { agent: true, inboundLen });
}

// Heuristica leve: extrai resumo da pipeline a partir do historico bruto.
// Nao tenta ser perfeito — so junta os sinais que ja apareceram pra dar ao
// Charles um cartao de chegada na conversa.
function resumirPipeline(historicoCombinado) {
  const txt = (historicoCombinado || '').toLowerCase();
  const out = {};
  if (/\bcomprar?\b|\bcompra\b|\bfinanci/.test(txt)) out.intencao = 'comprar';
  else if (/\balugar?\b|\baluguel\b|\blocac/.test(txt)) out.intencao = 'alugar';
  if (/\bmorar?\b|\bresidir|\bfamilia\b|familia/.test(txt)) out.perfil = 'morar';
  else if (/investir?|investiment/.test(txt)) out.perfil = 'investir';
  else if (/veraneio|ferias|temporada/.test(txt)) out.perfil = 'veraneio';
  const quartos = txt.match(/(\d+)\s*(?:quart|dorm|suite)/);
  if (quartos) out.quartos = quartos[1];
  if (/\ba\s*vista\b|à\s*vista/.test(txt)) out.pagamento = 'à vista';
  else if (/financi/.test(txt)) out.pagamento = 'financiamento';
  else if (/fgts/.test(txt)) out.pagamento = 'FGTS';
  if (/urgent|logo|semana|mes que vem|agora|imediat/.test(txt)) out.prazo = 'curto';
  else if (/pensar|depois|ainda|ano que vem/.test(txt)) out.prazo = 'longo';
  return out;
}

// Score 0-10 do lead. Combina pontos preenchidos da pipeline + bonus de
// pagamento (a vista > FGTS > financiamento) + bonus de prazo curto. Permite
// ao Charles priorizar leads quentes na hora de assumir manual.
function calcularScore(resumo) {
  if (!resumo) return 0;
  let score = 0;
  // 1 ponto por campo da pipeline preenchido (cap 6)
  const campos = ['intencao', 'perfil', 'quartos', 'pagamento', 'prazo'];
  score += campos.filter((k) => resumo[k]).length;
  // Bonus pagamento
  if (resumo.pagamento === 'à vista') score += 2;
  else if (resumo.pagamento === 'FGTS') score += 1;
  // Bonus prazo curto
  if (resumo.prazo === 'curto') score += 2;
  // Penalidade prazo longo
  if (resumo.prazo === 'longo') score -= 1;
  return Math.max(0, Math.min(10, score));
}

// Detecta se a IA gerou o "filtro pronto" — fala-gatilho do prompt quando
// 5/6 pontos da pipeline estao checados.
function indicaQualificacao(resposta) {
  const r = (resposta || '').toLowerCase();
  return /repassar.*charles|vou repassar|chama por aqui em instantes pra dar/i.test(r);
}

function splitInChunks(body) {
  // SO quebra se a IA usou linha em branco real entre paragrafos.
  // Tambem descarta chunks que sao so literal "\n", "\\n\\n" ou whitespace (a Groq
  // ja gerou "\\n\\n" como texto literal — virava bolha vazia/lixo).
  const chunks = body
    .split(/\n\s*\n+/)
    .map((c) => c.trim())
    .filter((c) => c && !/^(?:\\?n)+$/i.test(c) && /\S/.test(c.replace(/\\n/g, '')));
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

// Tempo de "leitura" antes do Charles começar a digitar. Curto pra resposta
// soar dentro de ~5-6s do inbound chegar.
function tempoLeitura(inboundLen = 0) {
  return Math.min(2500, 800 + Math.max(0, inboundLen) * 25);
}

// Tempo "digitando" — proporcional ao tamanho, teto em 3.5s.
// Mensagens curtas (10-12 palavras = ~60 chars) ficam em ~2s.
function tempoDigitacao(chunkLen) {
  return Math.min(3500, 600 + chunkLen * 50);
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
//
// COOLDOWN POR PHONE (incidente Scheila 2026-05-19, 15x mesma msg):
// antes de qualquer envio nao-conversacional, checa se ja saiu outbound pra
// esse phone nas ultimas BROADCAST_COOLDOWN_H horas (default 12). Se saiu,
// skipa silenciosamente — retorna { skipped:true, reason }. Resposta de IA
// (enviarResposta direto via processBatch) NAO passa por esse guard pra nao
// engasgar conversa ativa.
export async function enviarManual(phone, body, leadId, opts = {}) {
  // OPT_OUT: NUNCA mandar manual/broadcast pra lead que pediu pra sair OU
  // que foi marcado como tal (proprietario, em conversa humana, incidente).
  if (leadId) {
    const { data: leadCheck } = await supabase
      .from('leads').select('whatsapp_status').eq('id', leadId).single();
    if (leadCheck?.whatsapp_status === 'opt_out') {
      log.warn('Envio manual bloqueado por opt_out', { phone, leadId });
      return { skipped: true, reason: 'opt_out' };
    }
  }

  const cooldownH = parseFloat(process.env.BROADCAST_COOLDOWN_H || '12');
  if (!opts.skipCooldown && cooldownH > 0) {
    const cutoff = new Date(Date.now() - cooldownH * 3600_000).toISOString();
    const { data: recentOut } = await supabase
      .from('whatsapp_messages')
      .select('id, created_at')
      .eq('phone', phone)
      .eq('direction', 'out')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1);
    if (recentOut && recentOut.length > 0) {
      log.warn('Envio manual bloqueado por cooldown', {
        phone, leadId, cooldownH, ultimoOut: recentOut[0].created_at,
      });
      return { skipped: true, reason: `cooldown ${cooldownH}h`, lastOut: recentOut[0].created_at };
    }
  }
  return enviarResposta(phone, body, leadId, { agent: false, skipReadDelay: true });
}

export { linkImovel };
