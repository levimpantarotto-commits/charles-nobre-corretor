'use client';

import { useState, useEffect } from 'react';

function parseMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hulo])/gm, '')
    .split('\n')
    .map((line) => (line.trim() && !line.startsWith('<') ? `<p>${line}</p>` : line))
    .join('\n');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BriefingTab() {
  const [briefings, setBriefings] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  async function fetchBriefings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/briefing');
      if (!res.ok) throw new Error('Erro ao carregar briefings');
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.briefings || [];
      setBriefings(list.slice(0, 5));
      if (list.length > 0) setCurrent(list[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGerar() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/briefing', { method: 'POST' });
      if (!res.ok) throw new Error('Erro ao gerar briefing');
      const data = await res.json();
      await fetchBriefings();
      if (data.briefing) setCurrent(data.briefing);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    fetchBriefings();
  }, []);

  return (
    <div className="container">
      <div className="header">
        <h2 className="title">Briefing Diário</h2>
        <button
          className={`btn-gerar${generating ? ' loading' : ''}`}
          onClick={handleGerar}
          disabled={generating}
        >
          {generating ? (
            <span className="spinner-wrap">
              <span className="spinner" />
              Gerando...
            </span>
          ) : (
            '⚡ Gerar Agora'
          )}
        </button>
      </div>

      {error && <div className="error-bar">{error}</div>}

      <div className="layout">
        {/* Histórico lateral */}
        <div className="sidebar-hist">
          <div className="sidebar-label">Últimos 5</div>
          {loading ? (
            <div className="loading-text">Carregando...</div>
          ) : briefings.length === 0 ? (
            <div className="empty-hist">Nenhum briefing ainda</div>
          ) : (
            briefings.map((b, i) => (
              <button
                key={b.id || i}
                className={`hist-item${current?.id === b.id ? ' active' : ''}`}
                onClick={() => setCurrent(b)}
              >
                <span className="hist-date">{formatDate(b.created_at || b.date)}</span>
                <span className="hist-preview">
                  {(b.content || b.resumo || '').slice(0, 60)}...
                </span>
              </button>
            ))
          )}
        </div>

        {/* Conteúdo principal */}
        <div className="main-content">
          {loading ? (
            <div className="loading-card">
              <div className="spinner-large" />
              <span>Carregando briefing...</span>
            </div>
          ) : !current ? (
            <div className="empty-card">
              <div className="empty-icon">📋</div>
              <h3 className="empty-title">Nenhum briefing encontrado</h3>
              <p className="empty-desc">
                Clique em "⚡ Gerar Agora" para criar o primeiro briefing do dia com análise do
                pipeline, leads quentes e oportunidades.
              </p>
            </div>
          ) : (
            <div className="briefing-card">
              <div className="briefing-meta">
                <span className="briefing-badge">Briefing</span>
                <span className="briefing-date">
                  {formatDate(current.created_at || current.date)}
                </span>
              </div>
              <div
                className="briefing-body"
                dangerouslySetInnerHTML={{
                  __html: parseMarkdown(current.content || current.resumo || ''),
                }}
              />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .container {
          padding: 24px;
          min-height: 100%;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }
        .btn-gerar {
          background: #eab308;
          color: #0f172a;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .btn-gerar:hover:not(:disabled) {
          opacity: 0.85;
        }
        .btn-gerar:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-gerar.loading {
          background: #ca8a04;
        }
        .spinner-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid #0f172a;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        .spinner-large {
          width: 32px;
          height: 32px;
          border: 3px solid #1e293b;
          border-top-color: #eab308;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .error-bar {
          background: #450a0a;
          border: 1px solid #7f1d1d;
          color: #fca5a5;
          padding: 10px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
        }
        .layout {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }
        .sidebar-hist {
          width: 220px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sidebar-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }
        .loading-text,
        .empty-hist {
          font-size: 13px;
          color: #64748b;
          padding: 8px 0;
        }
        .hist-item {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 10px 12px;
          text-align: left;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: border-color 0.15s;
          width: 100%;
        }
        .hist-item:hover {
          border-color: #eab308;
        }
        .hist-item.active {
          border-color: #eab308;
          background: #1a1f2e;
        }
        .hist-date {
          font-size: 11px;
          color: #eab308;
          font-weight: 600;
        }
        .hist-preview {
          font-size: 12px;
          color: #64748b;
          line-height: 1.4;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .main-content {
          flex: 1;
          min-width: 0;
        }
        .loading-card,
        .empty-card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 48px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #64748b;
          text-align: center;
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .empty-title {
          font-size: 18px;
          font-weight: 600;
          color: #f8fafc;
          margin: 0 0 8px;
        }
        .empty-desc {
          font-size: 14px;
          color: #64748b;
          max-width: 360px;
          line-height: 1.6;
          margin: 0;
        }
        .briefing-card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 28px 32px;
        }
        .briefing-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .briefing-badge {
          background: #eab308;
          color: #0f172a;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 3px 10px;
          border-radius: 20px;
        }
        .briefing-date {
          font-size: 13px;
          color: #64748b;
        }
        .briefing-body {
          color: #f8fafc;
          font-size: 14px;
          line-height: 1.7;
        }
        .briefing-body :global(h1),
        .briefing-body :global(h2),
        .briefing-body :global(h3) {
          color: #eab308;
          margin: 20px 0 8px;
        }
        .briefing-body :global(h1) {
          font-size: 20px;
        }
        .briefing-body :global(h2) {
          font-size: 17px;
        }
        .briefing-body :global(h3) {
          font-size: 15px;
        }
        .briefing-body :global(strong) {
          color: #f8fafc;
          font-weight: 700;
        }
        .briefing-body :global(em) {
          color: #cbd5e1;
        }
        .briefing-body :global(code) {
          background: #1e293b;
          color: #eab308;
          padding: 1px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 13px;
        }
        .briefing-body :global(ul) {
          padding-left: 20px;
          margin: 8px 0;
        }
        .briefing-body :global(li) {
          color: #cbd5e1;
          margin-bottom: 4px;
        }
        .briefing-body :global(p) {
          margin: 0 0 12px;
          color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
