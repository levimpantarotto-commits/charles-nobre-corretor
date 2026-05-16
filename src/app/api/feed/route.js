// Feed VRSync XML pros portais imobiliarios (OLX Pro, ZAP, Viva Real, ImovelWeb, Chaves na Mao).
// URL publica: /api/feed
// Cache: 1h (revalidate). Portais puxam de 4h em 4h tipicamente.

import { supabase } from '@/lib/supabase';
import { toCanonical } from '@/lib/property-shape';
import { buildVRSyncFeed } from '@/lib/vrsync';

export const revalidate = 3600;

function baseUrlFromRequest(request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, '');
  try {
    const u = new URL(request.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'https://charlesrnobre.com.br';
  }
}

export async function GET(request) {
  const baseUrl = baseUrlFromRequest(request);

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<error>${error.message}</error>`,
      { status: 500, headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
    );
  }

  const properties = (data || []).map(toCanonical);

  const xml = buildVRSyncFeed(properties, {
    baseUrl,
    cliente: 'Charles R. Nobre Consultoria Imobiliaria',
    creci: '37177',
    email: process.env.ADMIN_CHARLES_EMAIL || '',
  });

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Feed-Count': String(properties.length),
    },
  });
}
