import { ImageResponse } from 'next/og';
import { getPostBySlug } from '@/lib/blog';

export const runtime = 'edge';
export const alt = 'Charles R. Nobre — Blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const title = post?.title || 'Blog Charles R. Nobre';
  const city = post?.city || 'Litoral catarinense';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '70px',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#c5a059',
            }}
          >
            Charles R. Nobre · Blog
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#c5a059',
            }}
          >
            {city}
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.1,
              color: '#fff',
              maxWidth: '95%',
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 20, color: '#cbd5e1' }}>
            charlesrnobre.com.br
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#94a3b8' }}>
            CRECI 37177 · Imbituba · Garopaba · Imaruí
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
