'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function BlogContent({ markdown }) {
  return (
    <div className="blog-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown || ''}</ReactMarkdown>
      <style jsx global>{`
        .blog-content {
          font-size: 1.05rem;
          line-height: 1.75;
          color: #1e293b;
        }
        .blog-content h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          color: #0f172a;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          line-height: 1.25;
        }
        .blog-content h3 {
          font-size: 1.3rem;
          color: #0f172a;
          margin-top: 2rem;
          margin-bottom: 0.8rem;
          font-weight: 800;
        }
        .blog-content p { margin: 0 0 1.2rem; }
        .blog-content strong { color: #0f172a; }
        .blog-content a { color: #c5a059; text-decoration: underline; text-underline-offset: 3px; }
        .blog-content a:hover { color: #a07c3a; }
        .blog-content ul, .blog-content ol { margin: 0 0 1.4rem 1.5rem; padding: 0; }
        .blog-content li { margin-bottom: 0.5rem; }
        .blog-content code {
          background: #f1f5f9;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .blog-content blockquote {
          border-left: 3px solid #c5a059;
          padding: 0.4rem 0 0.4rem 1.4rem;
          margin: 1.4rem 0;
          color: #475569;
          font-style: italic;
        }
        .blog-content hr { border: none; border-top: 1px solid #e2e8f0; margin: 2.5rem 0; }
        .blog-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.4rem 0;
          font-size: 0.95rem;
        }
        .blog-content th, .blog-content td {
          border: 1px solid #e2e8f0;
          padding: 0.6rem 0.9rem;
          text-align: left;
        }
        .blog-content th { background: #f8fafc; font-weight: 800; }
      `}</style>
    </div>
  );
}
