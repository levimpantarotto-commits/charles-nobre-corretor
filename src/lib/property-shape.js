// Adapter entre o shape canônico do app e o schema do Supabase.
// Schema (após migração 001): id, title, description, price, city, neighborhood,
// state, type, intent, category, features (text[] ou jsonb array), images,
// video, area, created_at.

export function toCanonical(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    price: Number(row.price) || 0,
    city: row.city ?? '',
    neighborhood: row.neighborhood ?? '',
    state: row.state ?? 'SC',
    type: row.type ?? '',
    intent: row.intent ?? 'venda',
    category: row.category ?? '',
    images: Array.isArray(row.images) ? row.images : [],
    video: row.video ?? '',
    features: Array.isArray(row.features) ? row.features : [],
    area: row.area ?? null,
    created_at: row.created_at ?? null,
  };
}

export function toSupabase(canonical) {
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

// Aceita formato antigo (location: {city, neighborhood, state}) e converte pro canônico achatado.
export function normalizeLegacy(item) {
  if (!item) return null;
  if (item.location && typeof item.location === 'object') {
    const { city, neighborhood, state } = item.location;
    const { location, ...rest } = item;
    return {
      ...rest,
      city: rest.city ?? city ?? '',
      neighborhood: rest.neighborhood ?? neighborhood ?? '',
      state: rest.state ?? state ?? 'SC',
    };
  }
  return item;
}
