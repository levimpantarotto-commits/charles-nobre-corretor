// Leitura de Google Sheets via Service Account (modo read-only).
// Espera env GOOGLE_SERVICE_ACCOUNT_JSON com path do JSON OU JSON inline (base64).
import { google } from 'googleapis';
import fs from 'fs';

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

async function getClient() {
  const creds = loadCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth: await auth.getClient() });
}

// Le linhas da planilha. Espera header na linha 1.
// Retorna array de objetos: [{ nome, telefone, email, ... }, ...]
export async function readLeadsSheet() {
  const sheets = await getClient();
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
