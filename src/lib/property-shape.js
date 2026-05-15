// Adapter entre o shape canônico do app e o schema atual do Supabase.
// Colunas reais do Supabase hoje: id, title, description, price, city, neighborhood,
// category, features, images, created_at.
// Campos extras (state, type, intent, video, area) ficam empacotados em `features.meta`
// até que o schema receba as colunas correspondentes via DDL.

export function toCanonical(row) {
  if (!row) return null;
  const features = row.features;
  let list = [];
  let meta = {};
  if (Array.isArray(features)) {
    list = features;
  } else if (features && typeof features === 'object') {
    list = Array.isArray(features.list) ? features.list : [];
    meta = features.meta && typeof features.meta === 'object' ? features.meta : {};
  }
  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    price: Number(row.price) || 0,
    city: row.city ?? meta.city ?? '',
    neighborhood: row.neighborhood ?? meta.neighborhood ?? '',
    state: meta.state ?? 'SC',
    type: meta.type ?? '',
    intent: meta.intent ?? 'venda',
    category: row.category ?? '',
    images: Array.isArray(row.images) ? row.images : [],
    video: meta.video ?? '',
    features: list,
    area: meta.area ?? null,
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
    category: canonical.category ?? '',
    images: Array.isArray(canonical.images) ? canonical.images : [],
    features: {
      list: Array.isArray(canonical.features) ? canonical.features : [],
      meta: {
        state: canonical.state ?? 'SC',
        type: canonical.type ?? '',
        intent: canonical.intent ?? 'venda',
        video: canonical.video ?? '',
        area: canonical.area ?? null,
      },
    },
  };
}

// Aceita tanto o formato antigo (location: {city, neighborhood, state}) quanto o canônico.
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
