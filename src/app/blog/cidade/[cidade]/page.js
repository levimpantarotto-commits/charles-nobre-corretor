import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BlogCard from '@/components/BlogCard';
import Link from 'next/link';
import { getAllPosts, cityFromSlug } from '@/lib/blog';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://charlesrnobre.com.br';

const CITIES = ['imbituba', 'garopaba', 'imarui'];

export function generateStaticParams() {
  return CITIES.map((c) => ({ cidade: c }));
}

export async function generateMetadata({ params }) {
  const { cidade } = await params;
  const city = cityFromSlug(cidade);
  if (!city) return { title: 'Cidade não encontrada' };
  return {
    title: `Blog ${city} | Imóveis e mercado imobiliário — Charles R. Nobre`,
    description: `Análises, guias e novidades do mercado imobiliário em ${city}, SC. Escrito por Charles R. Nobre, CRECI 37177.`,
    alternates: { canonical: `/blog/cidade/${cidade}` },
    openGraph: {
      title: `Blog ${city} — Imóveis no litoral catarinense`,
      description: `Guias e análises de quem mora na região.`,
      type: 'website',
      url: `${SITE_URL}/blog/cidade/${cidade}`,
    },
  };
}

export default async function BlogCityPage({ params }) {
  const { cidade } = await params;
  const city = cityFromSlug(cidade);
  if (!city) notFound();

  const posts = await getAllPosts({ limit: 100, city });

  return (
    <main className="blog-page">
      <Navbar />
      <section className="blog-hero">
        <div className="container">
          <Link href="/blog" className="back">← Todos os posts</Link>
          <span className="kicker">Blog · Foco em {city}</span>
          <h1>Imóveis em {city}, por dentro</h1>
          <p>
            Mercado, bairros, financiamento e o que evitar — direto de quem atua em {city} todos
            os dias. CRECI 37177.
          </p>
        </div>
      </section>

      <section className="blog-grid-section">
        <div className="container">
          {posts.length === 0 ? (
            <div className="blog-empty">
              <p>Ainda não temos posts sobre {city} — em breve.</p>
              <Link href="/blog" className="cta">Ver todos os posts</Link>
            </div>
          ) : (
            <div className="blog-grid">
              {posts.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
