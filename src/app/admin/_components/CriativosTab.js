'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Download, X, Search } from 'lucide-react';

const GOLD = '#C5A059';

const FORMATOS = [
  { key: 'story', label: 'Story', dim: '1080 × 1920', icon: '📱', desc: 'Vertical pra Stories/Reels' },
  { key: 'post',  label: 'Post',  dim: '1080 × 1080', icon: '📷', desc: 'Quadrado pro feed' },
  { key: 'card',  label: 'Card',  dim: '1200 × 630',  icon: '🖼️', desc: 'Open Graph / link preview' },
];

function formatarPreco(v) {
  const n = Number(v) || 0;
  if (!n) return 'Sob consulta';
  try {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  } catch {
    return `R$ ${n.toLocaleString('pt-BR')}`;
  }
}

export default function CriativosTab() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('');

  const [selecionado, setSelecionado] = useState(null);
  const [formatoAtivo, setFormatoAtivo] = useState(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/properties');
        if (!res.ok) throw new Error('Erro ao carregar imóveis');
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.properties || [];
        setProperties(list.filter((p) => Array.isArray(p.images) && p.images.length > 0));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtrados = useMemo(() => {
    if (!filtro.trim()) return properties;
    const q = filtro.toLowerCase();
    return properties.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (p.neighborhood || '').toLowerCase().includes(q)
    );
  }, [filtro, properties]);

  function abrirImovel(p) {
    setSelecionado(p);
    setFormatoAtivo(null);
    setImgLoading(false);
  }

  function fecharModal() {
    setSelecionado(null);
    setFormatoAtivo(null);
    setImgLoading(false);
  }

  function escolherFormato(fmt) {
    setFormatoAtivo(fmt);
    setImgLoading(true);
  }

  async function baixarPng() {
    if (!selecionado || !formatoAtivo) return;
    try {
      const url = `/api/criativos/${selecionado.id}?formato=${formatoAtivo.key}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao baixar imagem');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${selecionado.id}-${formatoAtivo.key}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      setToast('Imagem baixada com sucesso');
      setTimeout(() => setToast(null), 2400);
    } catch (e) {
      setToast('Erro ao baixar: ' + e.message);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 className="title">Criativos</h2>
          <p className="subtitle">Gere artes prontas pra postar no Instagram e Facebook</p>
        </div>
      </div>

      <div className="search-wrap">
        <Search size={16} className="search-icon" />
        <input
          className="search-input"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Filtrar por título, cidade ou bairro..."
        />
      </div>

      {error && <div className="error-bar">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Carregando imóveis...</span>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <ImageIcon size={42} />
          </div>
          <p>{properties.length === 0 ? 'Nenhum imóvel com imagem.' : 'Nenhum imóvel bate com o filtro.'}</p>
        </div>
      ) : (
        <div className="grid">
          {filtrados.map((p) => (
            <button key={p.id} className="card" onClick={() => abrirImovel(p)}>
              <div className="card-img-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0]} alt={p.title || ''} className="card-img" />
                <div className="card-img-overlay">
                  <ImageIcon size={18} />
                  <span>Gerar arte</span>
                </div>
              </div>
              <div className="card-body">
                <div className="card-titulo" title={p.title}>{p.title || 'Sem título'}</div>
                <div className="card-meta">
                  {[p.city, p.neighborhood].filter(Boolean).join(' · ') || '—'}
                </div>
                <div className="card-preco">{formatarPreco(p.price)}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selecionado && (
          <motion.div
            className="overlay"
            onClick={(e) => e.target === e.currentTarget && fecharModal()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="modal-header">
                <div>
                  <div className="modal-title">{selecionado.title || 'Imóvel'}</div>
                  <div className="modal-sub">
                    {[selecionado.city, selecionado.neighborhood].filter(Boolean).join(' · ')} · {formatarPreco(selecionado.price)}
                  </div>
                </div>
                <button className="modal-close" onClick={fecharModal} aria-label="Fechar">
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                {!formatoAtivo ? (
                  <>
                    <div className="modal-label">Escolha o formato</div>
                    <div className="formatos-grid">
                      {FORMATOS.map((f) => (
                        <button
                          key={f.key}
                          className="formato-btn"
                          onClick={() => escolherFormato(f)}
                        >
                          <span className="formato-icon">{f.icon}</span>
                          <span className="formato-label">{f.label}</span>
                          <span className="formato-dim">{f.dim}</span>
                          <span className="formato-desc">{f.desc}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="preview-header">
                      <div>
                        <div className="preview-titulo">
                          {formatoAtivo.icon} {formatoAtivo.label}
                          <span className="preview-dim"> · {formatoAtivo.dim}</span>
                        </div>
                      </div>
                      <button className="btn-trocar" onClick={() => setFormatoAtivo(null)}>
                        ← Trocar formato
                      </button>
                    </div>

                    <div className={`preview-wrap formato-${formatoAtivo.key}`}>
                      {imgLoading && (
                        <div className="skeleton">
                          <div className="skeleton-pulse" />
                          <span className="skeleton-text">Gerando criativo...</span>
                        </div>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/criativos/${selecionado.id}?formato=${formatoAtivo.key}`}
                        alt="Preview do criativo"
                        className="preview-img"
                        onLoad={() => setImgLoading(false)}
                        onError={() => setImgLoading(false)}
                        style={{ opacity: imgLoading ? 0 : 1 }}
                      />
                    </div>

                    <div className="modal-actions">
                      <button className="btn-download" onClick={baixarPng} disabled={imgLoading}>
                        <Download size={16} />
                        Baixar PNG
                      </button>
                      <button className="btn-fechar" onClick={fecharModal}>
                        <X size={16} />
                        Fechar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .container {
          padding: 24px;
          min-height: 100%;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 4px;
        }
        .subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }
        .search-wrap {
          position: relative;
          margin-bottom: 20px;
          max-width: 420px;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }
        .search-input {
          width: 100%;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 10px 12px 10px 36px;
          color: #f8fafc;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .search-input:focus {
          border-color: ${GOLD};
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
        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 60px 0;
          color: #64748b;
          font-size: 14px;
        }
        .empty-icon {
          color: #475569;
        }
        .spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #1e293b;
          border-top-color: ${GOLD};
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
        }
        .card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          text-align: left;
          padding: 0;
          display: flex;
          flex-direction: column;
          transition: border-color 0.2s, transform 0.2s;
        }
        .card:hover {
          border-color: ${GOLD};
          transform: translateY(-2px);
        }
        .card-img-wrap {
          position: relative;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: #020617;
        }
        .card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }
        .card:hover .card-img {
          transform: scale(1.05);
        }
        .card-img-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.1));
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 6px;
          padding-bottom: 14px;
          color: ${GOLD};
          font-size: 12px;
          font-weight: 700;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .card:hover .card-img-overlay {
          opacity: 1;
        }
        .card-body {
          padding: 12px 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .card-titulo {
          font-size: 14px;
          font-weight: 700;
          color: #f8fafc;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .card-meta {
          font-size: 12px;
          color: #64748b;
        }
        .card-preco {
          font-size: 14px;
          font-weight: 700;
          color: ${GOLD};
          margin-top: 4px;
        }
        /* Overlay & modal */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }
        .modal {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 16px;
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #1e293b;
          gap: 12px;
        }
        .modal-title {
          font-size: 16px;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 2px;
        }
        .modal-sub {
          font-size: 12px;
          color: #64748b;
        }
        .modal-close {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .modal-close:hover {
          color: #f8fafc;
          background: #1e293b;
        }
        .modal-body {
          padding: 20px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex: 1;
        }
        .modal-label {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .formatos-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 520px) {
          .formatos-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .formato-btn {
          background: #020617;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 18px 14px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: border-color 0.15s, transform 0.15s, background 0.15s;
        }
        .formato-btn:hover {
          border-color: ${GOLD};
          transform: translateY(-2px);
          background: #0a1224;
        }
        .formato-icon { font-size: 28px; }
        .formato-label {
          font-size: 14px;
          font-weight: 700;
          color: #f8fafc;
        }
        .formato-dim {
          font-size: 11px;
          color: ${GOLD};
          font-family: monospace;
        }
        .formato-desc {
          font-size: 11px;
          color: #64748b;
          text-align: center;
          margin-top: 2px;
        }
        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .preview-titulo {
          font-size: 14px;
          font-weight: 700;
          color: #f8fafc;
        }
        .preview-dim {
          color: ${GOLD};
          font-family: monospace;
          font-size: 12px;
          font-weight: 600;
        }
        .btn-trocar {
          background: transparent;
          border: 1px solid #1e293b;
          color: #94a3b8;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 12px;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .btn-trocar:hover {
          border-color: ${GOLD};
          color: ${GOLD};
        }
        .preview-wrap {
          position: relative;
          background: #020617;
          border: 1px solid #1e293b;
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 240px;
        }
        .preview-wrap.formato-story  { aspect-ratio: 9 / 16; max-height: 60vh; }
        .preview-wrap.formato-post   { aspect-ratio: 1 / 1; }
        .preview-wrap.formato-card   { aspect-ratio: 1200 / 630; }
        .preview-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: opacity 0.25s;
        }
        .skeleton {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: linear-gradient(110deg, #0f172a 25%, #1e293b 50%, #0f172a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s linear infinite;
        }
        .skeleton-pulse {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: ${GOLD};
          opacity: 0.4;
          animation: pulse 1.2s ease-in-out infinite;
        }
        .skeleton-text {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50%      { transform: scale(1.15); opacity: 0.8; }
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 4px;
        }
        .btn-download,
        .btn-fechar {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 8px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s, border-color 0.15s, color 0.15s;
        }
        .btn-download {
          background: ${GOLD};
          color: #0a0a0a;
          border: none;
        }
        .btn-download:hover:not(:disabled) {
          opacity: 0.88;
        }
        .btn-download:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-fechar {
          background: transparent;
          border: 1px solid #1e293b;
          color: #94a3b8;
        }
        .btn-fechar:hover {
          border-color: #334155;
          color: #f8fafc;
        }
        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          border: 1px solid ${GOLD};
          color: ${GOLD};
          padding: 12px 20px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          z-index: 1100;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
