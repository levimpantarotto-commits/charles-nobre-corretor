// Sincroniza leads de uma planilha Google Sheets pra tabela `leads` do Supabase.
// Usado tanto pelo script CLI (scripts/sync-leads-from-sheets.mjs) quanto pelo
// endpoint POST /admin/sync-sheets no server.js — mesma logica, dois drivers.
import { readLeadsSheet } from './sheets.js';
import { supabase, normalizePhone } from './supabase.js';
import { log } from './logger.js';

export async function syncLeadsFromSheets() {
  const rows = await readLeadsSheet();
  log.info(`Lidos ${rows.length} registros da planilha`);

  let inseridos = 0;
  let atualizados = 0;
  let pulados = 0;
  const erros = [];

  for (const row of rows) {
    const nome = row.nome || row.name || '';
    const telefone = normalizePhone(row.telefone || row.phone || row.celular || '');
    if (!telefone || !nome) {
      pulados++;
      continue;
    }

    const lead = {
      name: nome,
      phone: telefone,
      email: row.email || null,
      source: 'sheets',
      status: 'novo',
      whatsapp_status: 'pendente',
      notes: row.observacao || row.observacoes || row.interesse || null,
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
      if (!error) inseridos++;
      else erros.push({ telefone, op: 'insert', err: error.message });
    }
  }

  const result = { total: rows.length, inseridos, atualizados, pulados, erros };
  log.info('Sync concluido', result);
  return result;
}
