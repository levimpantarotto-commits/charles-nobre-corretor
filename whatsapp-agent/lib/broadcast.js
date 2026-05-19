// Disparo de primeira mensagem (broadcast) pros leads pendentes.
// Usa enviarManual (mesma pipeline do agente — typing, salva no banco)
// e respeita delay anti-ban entre envios.
import { supabase, normalizePhone } from './supabase.js';
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

  // Dedup por phone normalizado — incidente Scheila 2026-05-19: 15 leads pendentes
  // apontavam pro mesmo phone (formatos diferentes escaparam do dedup do sync),
  // cada lead.id virou 1 envio. Aqui mata na raiz: 1 phone = 1 envio, sempre.
  const porPhone = new Map();
  const duplicados = [];
  for (const l of elegiveis) {
    const normalized = normalizePhone(l.phone);
    if (!normalized) continue;
    if (porPhone.has(normalized)) {
      duplicados.push({ id: l.id, name: l.name, phone: l.phone, kept: porPhone.get(normalized).id });
      continue;
    }
    porPhone.set(normalized, l);
  }
  const dedupados = [...porPhone.values()];
  if (duplicados.length) {
    log.warn('Broadcast dedup descartou leads com phone repetido', {
      descartados: duplicados.length,
      amostra: duplicados.slice(0, 5),
    });
  }

  const alvo = limit > 0 ? dedupados.slice(0, limit) : dedupados;

  log.info('Broadcast preparado', {
    totalPendentes: leadsRaw.length,
    elegiveis: elegiveis.length,
    dedupados: dedupados.length,
    duplicados: duplicados.length,
    pulados,
    alvo: alvo.length,
    dryRun,
  });

  if (dryRun) {
    return {
      dryRun: true,
      totalPendentes: leadsRaw.length,
      elegiveis: elegiveis.length,
      dedupados: dedupados.length,
      duplicadosDescartados: duplicados,
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
  let cooldownSkip = 0;
  const erros = [];

  for (let i = 0; i < alvo.length; i++) {
    const l = alvo[i];
    const body = template.replace(/\{nome\}/g, primeiroNome(l.name));
    try {
      const result = await enviarManual(l.phone, body, l.id);
      if (result?.skipped) {
        cooldownSkip++;
        log.warn(`Broadcast [${i + 1}/${alvo.length}] SKIP cooldown`, {
          phone: l.phone, name: l.name, reason: result.reason,
        });
      } else {
        await touchLead(l.id, { whatsapp_status: 'enviado' });
        ok++;
        log.info(`Broadcast [${i + 1}/${alvo.length}] enviado`, { phone: l.phone, name: l.name });
      }
    } catch (err) {
      fail++;
      erros.push({ phone: l.phone, name: l.name, err: err.message });
      log.error('Broadcast falha', { phone: l.phone, err: err.message });
    }
    if (i < alvo.length - 1) await new Promise((r) => setTimeout(r, delayMs));
  }

  return { ok, fail, cooldownSkip, total: alvo.length, duplicadosDescartados: duplicados.length, erros };
}
