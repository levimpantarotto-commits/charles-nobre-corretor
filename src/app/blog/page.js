import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BlogCard from '@/components/BlogCard';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const revalidate = 60;

export const metadata = {
  title: 'Blog | Charles R. Nobre — Imóveis em Imbituba, Garopaba e Imaruí',
  description:
    'Guias e análises de mercado imobiliário em Imbituba, Garopaba e Imaruí. Onde comprar, como financiar e o que evitar — direto de quem mora na região há 12 anos. CRECI 37177.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog Charles R. Nobre — Imóveis no litoral catarinense',
    description:
      'Guias e análises pra quem compra, vende ou investe em Imbituba, Garopaba e Imaruí.',
    type: 'website',
    locale: 'pt_BR',
  },
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts({ limit: 50 });
  const cities = ['Imbituba', 'Garopaba', 'Imaruí'];

  return (
    <main className="blog-page">
      <Navbar />
      <section className="blog-hero">
        <div className="container">
          <span className="kicker">Blog Charles R. Nobre · CRECI 37177</span>
          <h1>O litoral catarinense, por dentro.</h1>
          <p>
            Guias práticos pra quem compra, vende ou investe em <strong>Imbituba</strong>,{' '}
            <strong>Garopaba</strong> e <strong>Imaruí</strong>. Escrito por quem mora na região.
          </p>
          <div className="city-filter">
            <Link href="/blog" className="active">Todos</Link>
            {cities.map((c) => (
              <Link
                key={c}
                href={`/blog/cidade/${c.toLowerCase().replace('í', 'i')}`}
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="blog-grid-section">
        <div className="container">
          {posts.length === 0 ? (
            <div className="blog-empty"><p>Nenhum post ainda — em breve.</p></div>
          ) : (
            <div className="blog-grid">
              {posts.map((p, idx) => (
                <BlogCard key={p.id || p.slug} post={p} featured={idx === 0 && posts.length > 1} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
