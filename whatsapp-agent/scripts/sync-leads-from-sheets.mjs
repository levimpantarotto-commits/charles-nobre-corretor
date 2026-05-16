// Sincroniza leads de uma planilha Google Sheets para a tabela `leads` do Supabase.
// Espera headers: nome, telefone, email (opcional), interesse (opcional), observacao (opcional).
// Roda: npm run sync-sheets

import dotenv from 'dotenv';
import { readLeadsSheet } from '../lib/sheets.js';
import { supabase, normalizePhone } from '../lib/supabase.js';
import { log } from '../lib/logger.js';

dotenv.config();

const rows = await readLeadsSheet();
log.info(`Lidos ${rows.length} registros da planilha`);

let inseridos = 0;
let pulados = 0;
let atualizados = 0;

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

  // ja existe por telefone?
  const { data: existing } = await supabase
    .from('leads')
    .select('id, whatsapp_status')
    .eq('phone', telefone)
    .limit(1);

  if (existing && existing.length > 0) {
    // so atualiza nome/observacao se mudaram, preserva whatsapp_status
    const { error } = await supabase
      .from('leads')
      .update({ name: nome, email: lead.email, notes: lead.notes })
      .eq('id', existing[0].id);
    if (!error) atualizados++;
  } else {
    const { error } = await supabase.from('leads').insert(lead);
    if (!error) inseridos++;
    else log.warn('Falha inserindo', { telefone, err: error.message });
  }
}

log.info('Sync concluido', { inseridos, atualizados, pulados, total: rows.length });
