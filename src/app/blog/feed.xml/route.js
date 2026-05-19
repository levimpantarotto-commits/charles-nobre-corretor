// RSS 2.0 dos ultimos posts publicados.
import { getAllPosts } from '@/lib/blog';

export const revalidate = 300; // 5 minutos

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://charlesrnobre.com.br';

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await getAllPosts({ limit: 20 });
  const lastBuild = posts[0]?.published_at || new Date().toISOString();

  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      return `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>
      <description>${escapeXml(p.excerpt || '')}</description>
      ${p.city ? `<category>${escapeXml(p.city)}</category>` : ''}
      ${(p.tags || []).map((t) => `<category>${escapeXml(t)}</category>`).join('')}
      <author>noreply@charlesrnobre.com.br (${escapeXml(p.author || 'Charles R. Nobre')})</author>
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Charles R. Nobre — Blog</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>Mercado imobiliário em Imbituba, Garopaba e Imaruí — guias e análises de Charles R. Nobre, CRECI 37177.</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
