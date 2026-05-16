// Disparo inicial: manda mensagem pra todos os leads com whatsapp_status='pendente'.
// Aceita TEMPLATE via env BROADCAST_TEMPLATE com {nome} como placeholder.
// Roda: BROADCAST_TEMPLATE="Olá {nome}, ..." npm run broadcast
//
// Em prod, sempre rodar com DRY_RUN=1 primeiro pra ver quantos vai disparar.

import dotenv from 'dotenv';
import { supabase } from '../lib/supabase.js';
import { sendText } from '../lib/evolution.js';
import { saveMessage, touchLead } from '../lib/supabase.js';
import { log } from '../lib/logger.js';

dotenv.config();

const TEMPLATE = process.env.BROADCAST_TEMPLATE
  || 'Olá {nome}! Aqui é o Charles Nobre, corretor de imóveis em Imbituba. Te mandei essa mensagem porque você demonstrou interesse em imóveis na nossa região. Posso te ajudar com alguma busca específica? Apartamento, casa, faixa de preço — me conta o que você procura.';

const DRY_RUN = process.env.DRY_RUN === '1';
const DELAY_MS = parseInt(process.env.BROADCAST_DELAY_MS, 10) || 3500; // pausa entre envios pra nao ser banido
const LIMIT = parseInt(process.env.BROADCAST_LIMIT, 10) || 0; // 0 = ilimitado

const { data: leads, error } = await supabase
  .from('leads')
  .select('id, name, phone, whatsapp_status')
  .eq('whatsapp_status', 'pendente')
  .not('phone', 'is', null);

if (error) { log.error('Falha lendo leads', { err: error.message }); process.exit(1); }

const alvo = LIMIT > 0 ? leads.slice(0, LIMIT) : leads;
log.info(`Broadcast: ${alvo.length} leads pendentes ${DRY_RUN ? '(DRY RUN)' : ''}`);

if (DRY_RUN) {
  alvo.slice(0, 5).forEach((l) => console.log(`  -> ${l.phone} | ${l.name}`));
  if (alvo.length > 5) console.log(`  ... e mais ${alvo.length - 5}`);
  process.exit(0);
}

let ok = 0, fail = 0;
for (const l of alvo) {
  const firstName = (l.name || '').split(' ')[0] || 'tudo bem';
  const body = TEMPLATE.replace(/\{nome\}/g, firstName);

  try {
    const sent = await sendText(l.phone, body, { delay: 1500 });
    await saveMessage({
      phone: l.phone,
      direction: 'out',
      body,
      leadId: l.id,
      evolutionMessageId: sent?.key?.id,
      agentResponse: false,
      meta: { broadcast: true },
    });
    await touchLead(l.id, { whatsapp_status: 'enviado' });
    ok++;
    log.info(`[${ok}/${alvo.length}] enviado`, { phone: l.phone });
  } catch (err) {
    fail++;
    log.error('Falha enviando', { phone: l.phone, err: err.message });
  }

  // pausa anti-ban
  await new Promise((r) => setTimeout(r, DELAY_MS));
}

log.info('Broadcast finalizado', { ok, fail, total: alvo.length });
