'use client';
import { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, Eye, EyeOff, Save, X, FileText } from 'lucide-react';

const CITIES = ['', 'Imbituba', 'Garopaba', 'Imaruí'];

export default function BlogTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // post sendo editado, ou {} pra novo
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/blog?published=all', { cache: 'no-store' });
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startNew() {
    setEditing({
      title: '',
      slug: '',
      excerpt: '',
      content_md: '',
      cover_image: '',
      city: '',
      tags: [],
      seo_keywords: [],
      published: false,
    });
  }

  function startEdit(p) {
    setEditing({ ...p, tags: p.tags || [], seo_keywords: p.seo_keywords || [] });
  }

  async function save() {
    setBusy(true);
    try {
      const isNew = !editing.id;
      const url = isNew ? '/api/blog' : `/api/blog/${editing.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      if (!res.ok) {
        const err = await res.json();
        alert('Erro: ' + (err.error || res.statusText));
        return;
      }
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(post) {
    if (!confirm(`Apagar "${post.title}"? Não tem volta.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/blog/${post.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert('Erro: ' + (err.error || res.statusText));
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(post) {
    setBusy(true);
    try {
      await fetch(`/api/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !post.published }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="blog-tab">
      <div className="head">
        <div>
          <h2>Blog</h2>
          <p className="muted">{posts.length} post{posts.length !== 1 ? 's' : ''} — publica direto no charlesrnobre.com.br/blog</p>
        </div>
        <button className="btn primary" onClick={startNew}><Plus size={16} /> Novo post</button>
      </div>

      {loading ? (
        <div className="empty">Carregando…</div>
      ) : posts.length === 0 ? (
        <div className="empty">
          <FileText size={48} />
          <p>Nenhum post ainda. Cria o primeiro.</p>
        </div>
      ) : (
        <div className="list">
          {posts.map((p) => (
            <div key={p.id} className="row">
              <div className="cover">
                {p.cover_image ? <img src={p.cover_image} alt="" /> : <div className="placeholder" />}
              </div>
              <div className="info">
                <div className="title-row">
                  <strong>{p.title}</strong>
                  {p.published ? (
                    <span className="badge pub">Publicado</span>
                  ) : (
                    <span className="badge draft">Rascunho</span>
                  )}
                  {p.city && <span className="badge city">{p.city}</span>}
                </div>
                <span className="muted small">/blog/{p.slug}</span>
                {p.excerpt && <p className="excerpt">{p.excerpt}</p>}
              </div>
              <div className="actions">
                <button className="btn" onClick={() => togglePublish(p)} disabled={busy} title={p.published ? 'Despublicar' : 'Publicar'}>
                  {p.published ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button className="btn" onClick={() => startEdit(p)} disabled={busy}>
                  <Edit3 size={16} />
                </button>
                <button className="btn danger" onClick={() => remove(p)} disabled={busy}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setEditing(null)}>
          <div className="modal">
            <div className="modal-head">
              <h3>{editing.id ? 'Editar post' : 'Novo post'}</h3>
              <button className="btn icon" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>

            <div className="modal-body">
              <label>Título</label>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Ex: Como comprar imóvel em Imbituba"
              />

              <label>Slug (URL)</label>
              <input
                type="text"
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder="deixe-vazio-pra-gerar-do-titulo"
              />

              <label>Resumo (excerpt)</label>
              <textarea
                rows={2}
                value={editing.excerpt}
                onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                placeholder="2 linhas que aparecem no card + meta description"
              />

              <div className="grid-2">
                <div>
                  <label>Cidade</label>
                  <select
                    value={editing.city || ''}
                    onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                  >
                    {CITIES.map((c) => <option key={c} value={c}>{c || '— Geral —'}</option>)}
                  </select>
                </div>
                <div>
                  <label>Capa (URL)</label>
                  <input
                    type="text"
                    value={editing.cover_image || ''}
                    onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <label>Tags (vírgula)</label>
              <input
                type="text"
                value={(editing.tags || []).join(', ')}
                onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                placeholder="compra, financiamento, praia do rosa"
              />

              <label>Conteúdo (Markdown)</label>
              <textarea
                rows={20}
                value={editing.content_md}
                onChange={(e) => setEditing({ ...editing, content_md: e.target.value })}
                placeholder="## Subtítulo&#10;&#10;Texto do post em **markdown**..."
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              />

              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={!!editing.published}
                  onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                />
                Publicar imediatamente
              </label>
            </div>

            <div className="modal-foot">
              <button className="btn" onClick={() => setEditing(null)} disabled={busy}>Cancelar</button>
              <button className="btn primary" onClick={save} disabled={busy || !editing.title || !editing.content_md}>
                <Save size={16} /> {busy ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .blog-tab { padding: 2rem; color: #f8fafc; }
        .head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
        h2 { font-size: 1.4rem; margin: 0 0 0.3rem; }
        .muted { color: #94a3b8; font-size: 0.85rem; }
        .small { font-size: 0.75rem; }

        .btn {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.6rem 1rem; background: #0f172a; color: #f8fafc;
          border: 1px solid #1e293b; border-radius: 8px; cursor: pointer;
          font-weight: 700; font-size: 0.85rem; transition: 0.2s;
        }
        .btn:hover:not(:disabled) { background: #1e293b; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn.primary { background: #eab308; color: #0f172a; border-color: #eab308; }
        .btn.primary:hover:not(:disabled) { background: #ca8a04; }
        .btn.danger:hover:not(:disabled) { background: #ef4444; border-color: #ef4444; }
        .btn.icon { padding: 0.5rem; }

        .empty { text-align: center; padding: 4rem; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 1rem; }

        .list { display: flex; flex-direction: column; gap: 1rem; }
        .row { display: grid; grid-template-columns: 120px 1fr auto; gap: 1.5rem; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 1rem; align-items: center; }
        .cover { width: 120px; height: 80px; overflow: hidden; border-radius: 8px; }
        .cover img, .placeholder { width: 100%; height: 100%; object-fit: cover; }
        .placeholder { background: linear-gradient(135deg, #1e293b, #0f172a); }
        .info { min-width: 0; }
        .title-row { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.3rem; flex-wrap: wrap; }
        .title-row strong { font-size: 1rem; }
        .badge { font-size: 0.65rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 4px; letter-spacing: 0.1em; text-transform: uppercase; }
        .badge.pub { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
        .badge.draft { background: rgba(234, 179, 8, 0.15); color: #eab308; }
        .badge.city { background: rgba(197, 160, 89, 0.15); color: #c5a059; }
        .excerpt { font-size: 0.85rem; color: #cbd5e1; margin: 0.4rem 0 0; line-height: 1.5; }
        .actions { display: flex; gap: 0.4rem; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .modal { background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; width: 100%; max-width: 800px; max-height: 90vh; display: flex; flex-direction: column; }
        .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; border-bottom: 1px solid #1e293b; }
        .modal-head h3 { margin: 0; font-size: 1.2rem; }
        .modal-body { flex: 1; overflow-y: auto; padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 0.4rem; }
        .modal-body label { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; margin-top: 0.8rem; }
        .modal-body label:first-child { margin-top: 0; }
        .modal-body input[type=text], .modal-body textarea, .modal-body select {
          background: #020617; border: 1px solid #1e293b; border-radius: 8px;
          padding: 0.8rem; color: #f8fafc; font-size: 0.9rem; width: 100%;
          outline: none; transition: 0.2s;
        }
        .modal-body input:focus, .modal-body textarea:focus, .modal-body select:focus { border-color: #eab308; }
        .modal-body textarea { resize: vertical; min-height: 60px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .checkbox { display: flex !important; flex-direction: row !important; align-items: center; gap: 0.6rem; cursor: pointer; }
        .checkbox input { width: auto !important; }
        .modal-foot { padding: 1.5rem 2rem; border-top: 1px solid #1e293b; display: flex; justify-content: flex-end; gap: 0.8rem; }
      `}</style>
    </div>
  );
}
