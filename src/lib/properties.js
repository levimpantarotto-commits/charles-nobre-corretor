// Helper server-side pra carregar propriedades em shape canônico.
// Tenta Supabase (3s timeout); se falhar, lê listings.json local.
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { toCanonical, normalizeLegacy } from '@/lib/property-shape';

const DATA_PATH = path.join(process.cwd(), 'src/data/listings.json');

function readLocalCanonical() {
  const contents = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(contents);
  return Array.isArray(data) ? data.map((it) => toCanonical(normalizeLegacy(it))) : [];
}

export async function getAllProperties() {
  try {
    const dbPromise = supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase Timeout')), 3000)
    );
    const { data, error } = await Promise.race([dbPromise, timeoutPromise]);
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(toCanonical);
    }
    if (error) console.warn('properties: Supabase erro, usando fallback —', error.message);
  } catch (err) {
    console.warn('properties: Supabase indisponível, usando fallback —', err.message);
  }
  return readLocalCanonical();
}

export async function getPropertyById(id) {
  const all = await getAllProperties();
  return all.find((p) => String(p.id) === String(id)) ?? null;
}

export async function getPropertiesByCity(city) {
  const all = await getAllProperties();
  const target = city.toLowerCase();
  return all.filter((p) => (p.city || '').toLowerCase() === target);
}
