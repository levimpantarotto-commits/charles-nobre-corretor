// Leitura + escrita de Google Sheets via Service Account.
// Espera env GOOGLE_SERVICE_ACCOUNT_JSON com path do JSON OU JSON inline (base64).
//
// IMPORTANTE: a Service Account precisa ter permissao de EDITOR na planilha
// pra escrita funcionar (ate agora era so leitor).
import { google } from 'googleapis';
import fs from 'fs';
import { log } from './logger.js';
import { normalizePhone } from './supabase.js';

function loadCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON nao configurado');

  // Caso 1: caminho de arquivo
  if (raw.endsWith('.json') && fs.existsSync(raw)) {
    return JSON.parse(fs.readFileSync(raw, 'utf8'));
  }
  // Caso 2: JSON inline
  if (raw.trim().startsWith('{')) {
    return JSON.parse(raw);
  }
  // Caso 3: base64
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON invalido (esperado path .json, JSON inline ou base64)');
  }
}

async function getClient(readOnly = true) {
  const creds = loadCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [readOnly
      ? 'https://www.googleapis.com/auth/spreadsheets.readonly'
      : 'https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth: await auth.getClient() });
}

// Le linhas da planilha. Espera header na linha 1.
// Retorna array de objetos: [{ nome, telefone, email, ... }, ...]
export async function readLeadsSheet() {
  const sheets = await getClient(true);
  const spreadsheetId = process.env.GOOGLE_SHEETS_LEADS_ID;
  const range = process.env.GOOGLE_SHEETS_LEADS_RANGE || 'Leads!A:F';

  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_LEADS_ID nao configurado');

  const { data } = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = data.values || [];
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/\s+/g, '_'));
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (row[i] || '').trim(); });
    return obj;
  });
}

// Escreve resumo de qualificacao da IA de volta na planilha de leads.
// DORMENTE se GOOGLE_SHEETS_QUALIFICACAO_COL nao estiver setado — nao quer
// arriscar sobrescrever coluna errada se Levi nao deu OK.
//
// Encontra a linha do lead pelo phone (normalizado em ambos os lados pra
// tolerar formatos diferentes na planilha vs banco). Escreve uma string
// formatada na coluna configurada (ex: "Q") — formato:
//   "[2026-05-19] Score 8/10 | comprar/morar/3q/financiamento/curto"
//
// Header da coluna de telefone tem que ser identificavel (busca em colunas
// "telefone", "phone", "celular", "whatsapp", "numero").
export async function writeQualificationToSheet(phone, resumo, score) {
  const col = process.env.GOOGLE_SHEETS_QUALIFICACAO_COL;
  if (!col) {
    log.debug('Sheets write dormente — defina GOOGLE_SHEETS_QUALIFICACAO_COL pra ativar');
    return { skipped: true, reason: 'col_nao_configurada' };
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_LEADS_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_LEADS_ID nao configurado');

  const sheetName = (process.env.GOOGLE_SHEETS_LEADS_RANGE || 'Leads!A:F').split('!')[0];
  const sheets = await getClient(false);

  // 1. Le tudo pra achar a linha
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });
  const rows = data.values || [];
  if (rows.length === 0) return { skipped: true, reason: 'planilha_vazia' };

  const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/\s+/g, '_'));
  const phoneColIdx = headers.findIndex((h) =>
    ['telefone', 'phone', 'celular', 'whatsapp', 'numero'].includes(h)
  );
  if (phoneColIdx < 0) {
    log.warn('Sheets: coluna de telefone nao encontrada', { headers });
    return { skipped: true, reason: 'coluna_telefone_nao_achada' };
  }

  const phoneNorm = normalizePhone(phone);
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const rowPhoneNorm = normalizePhone(rows[i][phoneColIdx] || '');
    if (rowPhoneNorm && rowPhoneNorm === phoneNorm) {
      rowIndex = i + 1; // 1-based pra Sheets API
      break;
    }
  }
  if (rowIndex < 0) {
    log.warn('Sheets: lead nao achado por phone', { phone });
    return { skipped: true, reason: 'lead_nao_achado' };
  }

  // 2. Monta string + escreve
  const dataIso = new Date().toISOString().slice(0, 10);
  const partes = [
    resumo.intencao,
    resumo.perfil,
    resumo.quartos ? `${resumo.quartos}q` : null,
    resumo.pagamento,
    resumo.prazo ? `prazo ${resumo.prazo}` : null,
  ].filter(Boolean);
  const valor = `[${dataIso}] Score ${score}/10 | ${partes.join('/')}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${col}${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[valor]] },
  });

  log.info('Sheets: qualificacao escrita', { phone, row: rowIndex, col, valor });
  return { ok: true, row: rowIndex, col, valor };
}
