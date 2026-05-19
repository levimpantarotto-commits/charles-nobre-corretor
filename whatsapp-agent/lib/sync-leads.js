// Sincroniza leads de uma planilha Google Sheets pra tabela `leads` do Supabase.
// Usado tanto pelo script CLI (scripts/sync-leads-from-sheets.mjs) quanto pelo
// endpoint POST /admin/sync-sheets no server.js — mesma logica, dois drivers.
import { readLeadsSheet } from './sheets.js';
import { supabase, normalizePhone } from './supabase.js';
import { notifyNovosLeads } from './telegram.js';
import { log } from './logger.js';

export async function syncLeadsFromSheets() {
  const rows = await readLeadsSheet();
  log.info(`Lidos ${rows.length} registros da planilha`);

  let inseridos = 0;
  let atualizados = 0;
  let pulados = 0;
  const erros = [];
  const novos = []; // {name, phone} pra notificar Telegram

  for (const row of rows) {
    // Aceita varios nomes de header — incluindo export do Meta Lead Ads (full_name, phone).
    const nome = row.nome || row.name || row.full_name || row.fullname || row.cliente || '';
    const telefone = normalizePhone(
      row.telefone || row.phone || row.celular || row.whatsapp || row.numero || ''
    );
    if (!telefone || !nome) {
      pulados++;
      continue;
    }

    // Monta nota: contexto Meta Ads + coluna ATUALIZACAO (preenchida manualmente
    // pelo Charles/Levi com retorno de cliente que ja teve contato).
    const partesContexto = [];
    if (row.campaign_name) partesContexto.push(`campanha: ${row.campaign_name}`);
    if (row.ad_name) partesContexto.push(`anuncio: ${row.ad_name}`);
    if (row.platform) partesContexto.push(`plataforma: ${row.platform}`);

    const partes = [];
    if (partesContexto.length) partes.push(`Lead Meta Ads — ${partesContexto.join(' · ')}`);
    const atualizacao = row.atualizacao || row['atualização'] || row.atualização || null;
    if (atualizacao) partes.push(`ATUALIZAÇÃO: ${atualizacao}`);
    const observacao = row.observacao || row.observacoes || row.interesse || null;
    if (observacao) partes.push(observacao);

    const notes = partes.length ? partes.join('\n\n') : null;

    const lead = {
      name: nome,
      phone: telefone,
      email: row.email || null,
      source: row.campaign_name ? 'meta_ads' : 'sheets',
      status: 'novo',
      whatsapp_status: 'pendente',
      notes,
    };

    const { data: existing } = await supabase
      .from('leads')
      .select('id, whatsapp_status')
      .eq('phone', telefone)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('leads')
        .update({ name: nome, email: lead.email, notes: lead.notes })
        .eq('id', existing[0].id);
      if (!error) atualizados++;
      else erros.push({ telefone, op: 'update', err: error.message });
    } else {
      const { error } = await supabase.from('leads').insert(lead);
      if (!error) {
        inseridos++;
        novos.push({ name: nome, phone: telefone });
      } else {
        erros.push({ telefone, op: 'insert', err: error.message });
      }
    }
  }

  // Notifica Telegram de novos leads (fire-and-forget — nao bloqueia retorno).
  if (novos.length > 0) {
    notifyNovosLeads(novos).catch((e) => log.debug('Telegram notify falhou', { err: e.message }));
  }

  const result = { total: rows.length, inseridos, atualizados, pulados, novos, erros };
  log.info('Sync concluido', { ...result, novos: novos.length });
  return result;
}
