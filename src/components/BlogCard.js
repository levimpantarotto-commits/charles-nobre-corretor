import Link from 'next/link';
import { formatDate } from '@/lib/blog';

export default function BlogCard({ post, featured = false }) {
  if (!post) return null;
  return (
    <article className={`blog-card ${featured ? 'featured' : ''}`}>
      <Link href={`/blog/${post.slug}`} className="cover-link" aria-label={post.title}>
        {post.cover_image ? (
          <img src={post.cover_image} alt={post.title} className="cover" loading="lazy" />
        ) : (
          <div className="cover placeholder" />
        )}
      </Link>
      <div className="body">
        {post.city && <span className="chip">{post.city}</span>}
        <h3>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        {post.excerpt && <p className="excerpt">{post.excerpt}</p>}
        <div className="meta">
          <span>{formatDate(post.published_at)}</span>
          {post.reading_minutes ? <span>· {post.reading_minutes} min de leitura</span> : null}
        </div>
      </div>
    </article>
  );
}
