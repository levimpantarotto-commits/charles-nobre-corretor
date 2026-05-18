// Disparo de primeira mensagem (broadcast) pros leads pendentes.
// Usa enviarManual (mesma pipeline do agente — typing, salva no banco)
// e respeita delay anti-ban entre envios.
import { supabase } from './supabase.js';
import { enviarManual } from './conversation.js';
import { touchLead } from './supabase.js';
import { log } from './logger.js';

const DEFAULT_TEMPLATE =
  process.env.BROADCAST_TEMPLATE ||
  `Oi {nome}, aqui e o Charles Nobre — corretor em Imbituba e Garopaba.
Voce deixou contato num anuncio nosso. Vi que tem interesse em imovel na regiao, ta certo isso?`;

function primeiroNome(name) {
  return (name || '').trim().split(/\s+/)[0] || 'tudo bem';
}

function naoEstaNoSkip(lead, skipNames) {
  if (!skipNames || skipNames.length === 0) return true;
  const nomeLower = (lead.name || '').toLowerCase();
  return !skipNames.some((s) => nomeLower.includes(s.toLowerCase()));
}

export async function runBroadcast(options = {}) {
  const {
    dryRun = false,
    limit = 0,
    delayMs = parseInt(process.env.BROADCAST_DELAY_MS, 10) || 4000,
    template = DEFAULT_TEMPLATE,
    skipNames = [],
  } = options;

  const { data: leadsRaw, error } = await supabase
    .from('leads')
    .select('id, name, phone, whatsapp_status, notes')
    .eq('whatsapp_status', 'pendente')
    .not('phone', 'is', null);
  if (error) throw new Error(`Falha lendo leads: ${error.message}`);

  const elegiveis = leadsRaw.filter((l) => naoEstaNoSkip(l, skipNames));
  const pulados = leadsRaw.length - elegiveis.length;
  const alvo = limit > 0 ? elegiveis.slice(0, limit) : elegiveis;

  log.info('Broadcast preparado', {
    totalPendentes: leadsRaw.length,
    elegiveis: elegiveis.length,
    pulados,
    alvo: alvo.length,
    dryRun,
  });

  if (dryRun) {
    return {
      dryRun: true,
      totalPendentes: leadsRaw.length,
      elegiveis: elegiveis.length,
      pulados,
      alvo: alvo.length,
      preview: alvo.slice(0, 10).map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        msg: template.replace(/\{nome\}/g, primeiroNome(l.name)),
      })),
      skippedSample: leadsRaw
        .filter((l) => !naoEstaNoSkip(l, skipNames))
        .map((l) => ({ name: l.name, phone: l.phone })),
    };
  }

  let ok = 0;
  let fail = 0;
  const erros = [];

  for (let i = 0; i < alvo.length; i++) {
    const l = alvo[i];
    const body = template.replace(/\{nome\}/g, primeiroNome(l.name));
    try {
      await enviarManual(l.phone, body, l.id);
      await touchLead(l.id, { whatsapp_status: 'enviado' });
      ok++;
      log.info(`Broadcast [${i + 1}/${alvo.length}] enviado`, { phone: l.phone, name: l.name });
    } catch (err) {
      fail++;
      erros.push({ phone: l.phone, name: l.name, err: err.message });
      log.error('Broadcast falha', { phone: l.phone, err: err.message });
    }
    if (i < alvo.length - 1) await new Promise((r) => setTimeout(r, delayMs));
  }

  return { ok, fail, total: alvo.length, erros };
}
