// CLI thin wrapper. Logica fica em lib/sync-leads.js (reusado pelo endpoint admin).
// Roda: npm run sync-sheets
import dotenv from 'dotenv';
dotenv.config();

import { syncLeadsFromSheets } from '../lib/sync-leads.js';

await syncLeadsFromSheets();
