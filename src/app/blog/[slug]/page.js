import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BlogContent from '@/components/BlogContent';
import BlogCard from '@/components/BlogCard';
import Link from 'next/link';
import { getPostBySlug, getAllPostSlugs, getAllPosts, formatDate } from '@/lib/blog';

export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://charlesrnobre.com.br';

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: 'Post não encontrado' };

  const url = `${SITE_URL}/blog/${post.slug}`;
  const desc = post.excerpt || (post.content_md || '').slice(0, 160);

  return {
    title: `${post.title} | Blog Charles R. Nobre`,
    description: desc,
    keywords: (post.seo_keywords || []).join(', '),
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: desc,
      url,
      type: 'article',
      locale: 'pt_BR',
      publishedTime: post.published_at,
      authors: [post.author || 'Charles R. Nobre'],
      tags: post.tags || [],
      images: post.cover_image ? [{ url: post.cover_image, width: 1200, height: 630, alt: post.title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: desc,
      images: post.cover_image ? [post.cover_image] : [],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const all = await getAllPosts({ limit: 20 });
  const related = all
    .filter((p) => p.slug !== post.slug)
    .filter(
      (p) =>
        (post.city && p.city === post.city) ||
        (post.tags || []).some((t) => (p.tags || []).includes(t)),
    )
    .slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image ? [post.cover_image] : undefined,
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: { '@type': 'Person', name: post.author || 'Charles R. Nobre', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Charles R. Nobre Corretor',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/logo-trimmed.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
    keywords: (post.seo_keywords || []).join(', '),
    inLanguage: 'pt-BR',
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };

  return (
    <main className="blog-page-white">
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <article className="post">
        <header className="post-header">
          <div className="post-narrow">
            <nav className="post-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">Início</Link>
              <span> · </span>
              <Link href="/blog">Blog</Link>
              {post.city && (
                <>
                  <span> · </span>
                  <Link href={`/blog/cidade/${post.city.toLowerCase().replace('í', 'i')}`}>{post.city}</Link>
                </>
              )}
            </nav>
            <h1>{post.title}</h1>
            {post.excerpt && <p className="post-lead">{post.excerpt}</p>}
            <div className="post-byline">
              <span>{post.author || 'Charles R. Nobre'}</span>
              <span>·</span>
              <span>{formatDate(post.published_at)}</span>
              {post.reading_minutes ? (
                <>
                  <span>·</span>
                  <span>{post.reading_minutes} min de leitura</span>
                </>
              ) : null}
            </div>
          </div>
        </header>

        {post.cover_image && (
          <div className="post-cover-wrap">
            <img src={post.cover_image} alt={post.title} />
          </div>
        )}

        <div className="post-narrow post-body">
          <BlogContent markdown={post.content_md} />

          <footer className="post-foot">
            <h4>Tem dúvida sobre o que comprar na região?</h4>
            <p>
              Sou Charles, corretor com CRECI 37177 e moro entre Imbituba e Garopaba há 12 anos.
              Me chama no WhatsApp e te ajudo a achar o imóvel certo pro seu objetivo.
            </p>
            <Link href="/#contact" className="post-cta">Falar com Charles</Link>
          </footer>
        </div>
      </article>

      {related.length > 0 && (
        <section className="related">
          <div className="container">
            <h2>Continue lendo</h2>
            <div className="related-grid">
              {related.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
