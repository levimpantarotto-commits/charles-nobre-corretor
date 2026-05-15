// One-off: sincroniza src/data/listings.json pra Supabase usando service_role.
// Match por título (case-insensitive trim) pra reaproveitar UUIDs existentes.
// Uso: node src/scripts/sync-listings-to-supabase.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

try { require('dotenv').config({ path: '.env.local' }); } catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function toSupabase(canonical) {
  return {
    id: canonical.id,
    title: canonical.title ?? '',
    description: canonical.description ?? '',
    price: Number(canonical.price) || 0,
    city: canonical.city ?? '',
    neighborhood: canonical.neighborhood ?? '',
    state: canonical.state ?? 'SC',
    type: canonical.type ?? '',
    intent: canonical.intent ?? 'venda',
    category: canonical.category ?? '',
    images: Array.isArray(canonical.images) ? canonical.images : [],
    video: canonical.video ?? '',
    features: Array.isArray(canonical.features) ? canonical.features : [],
    area: canonical.area ?? null,
  };
}

function normTitle(s) {
  return (s || '').trim().toLowerCase();
}

async function main() {
  const local = JSON.parse(fs.readFileSync('./src/data/listings.json', 'utf8'));
  const { data: existing, error } = await sb.from('properties').select('id, title');
  if (error) { console.error('Erro lendo Supabase:', error); process.exit(1); }

  const byTitle = new Map(existing.map((r) => [normTitle(r.title), r.id]));

  console.log(`Local: ${local.length} | Supabase: ${existing.length}`);

  const updatedLocal = [];
  for (const item of local) {
    const matchId = byTitle.get(normTitle(item.title));
    const finalId = matchId ?? crypto.randomUUID();
    const action = matchId ? 'UPDATE' : 'INSERT';
    const row = toSupabase({ ...item, id: finalId });

    const { error: upErr } = await sb.from('properties').upsert(row, { onConflict: 'id' });
    if (upErr) {
      console.error(`✗ ${action} ${item.title}:`, upErr.message);
    } else {
      console.log(`✓ ${action} ${item.title} → ${finalId}`);
    }
    updatedLocal.push({ ...item, id: finalId });
  }

  // Reescreve o listings.json com os UUIDs definitivos pra alinhar IDs
  fs.writeFileSync('./src/data/listings.json', JSON.stringify(updatedLocal, null, 2), 'utf8');
  console.log('\nlistings.json reescrito com UUIDs.');

  const { data: final } = await sb.from('properties').select('id, title').order('created_at', { ascending: false });
  console.log(`\nEstado final Supabase: ${final.length} imóveis`);
  final.forEach((r) => console.log(`  - ${r.id} | ${r.title}`));
}

main().catch((e) => { console.error(e); process.exit(1); });
