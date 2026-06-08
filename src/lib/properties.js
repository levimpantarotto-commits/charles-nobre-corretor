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

// Mantém só imóveis com ao menos 1 foto — imóvel sem foto fica oculto do site
// público automaticamente, e reaparece sozinho assim que ganhar uma imagem.
function comFoto(p) {
  return Array.isArray(p.images) && p.images.length > 0;
}

export async function getAllProperties() {
  try {
    // Imóveis próprios do Charles primeiro ('charles' < 'rokni'), depois importados.
    const dbPromise = supabase
      .from('properties')
      .select('*')
      .order('origem', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase Timeout')), 12000)
    );
    const { data, error } = await Promise.race([dbPromise, timeoutPromise]);
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(toCanonical).filter(comFoto);
    }
    if (error) console.warn('properties: Supabase erro, usando fallback —', error.message);
  } catch (err) {
    console.warn('properties: Supabase indisponível, usando fallback —', err.message);
  }
  return readLocalCanonical().filter(comFoto);
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
