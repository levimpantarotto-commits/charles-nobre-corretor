'use client';

import { useState, useEffect } from 'react';

function TagInput({ value, onChange }) {
  const [input, setInput] = useState('');

  function addTag(e) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const tag = input.trim().replace(/,$/, '');
      if (tag && !value.includes(tag)) onChange([...value, tag]);
      setInput('');
    }
  }

  function removeTag(tag) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="tag-input-wrap">
      {value.map((tag) => (
        <span key={tag} className="tag-chip">
          {tag}
          <button className="tag-remove" onClick={() => removeTag(tag)}>
            ×
          </button>
        </span>
      ))}
      <input
        className="tag-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={addTag}
        placeholder="Digite e pressione Enter"
      />
      <style jsx>{`
        .tag-input-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 8px 10px;
          min-height: 44px;
          align-items: center;
        }
        .tag-chip {
          background: #1e293b;
          border: 1px solid #eab308;
          color: #eab308;
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .tag-remove {
          background: none;
          border: none;
          color: #eab308;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          padding: 0;
        }
        .tag-input {
          background: transparent;
          border: none;
          outline: none;
          color: #f8fafc;
          font-size: 13px;
          flex: 1;
          min-width: 120px;
        }
        .tag-input::placeholder {
          color: #475569;
        }
      `}</style>
    </div>
  );
}

const EMPTY_FORM = {
  slug: '',
  titulo: '',
  descricao: '',
  prompt_template: '',
  matchers: [],
};

export default function SkillsTab() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal nova skill
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Modal executar
  const [execSkill, setExecSkill] = useState(null);
  const [execInput, setExecInput] = useState('');
  const [execResult, setExecResult] = useState(null);
  const [executing, setExecuting] = useState(false);

  async function fetchSkills() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/skills');
      if (!res.ok) throw new Error('Erro ao carregar skills');
      const data = await res.json();
      setSkills(Array.isArray(data) ? data : data.skills || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Deletar esta skill?')) return;
    try {
      await fetch(`/api/skills/${id}`, { method: 'DELETE' });
      setSkills((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      alert('Erro ao deletar: ' + e.message);
    }
  }

  async function handleSave() {
    if (!form.slug || !form.titulo) return;
    setSaving(true);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erro ao salvar skill');
      await fetchSkills();
      setShowNew(false);
      setForm(EMPTY_FORM);
    } catch (e) {
      alert('Erro: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExecutar() {
    if (!execSkill) return;
    setExecuting(true);
    setExecResult(null);
    try {
      const res = await fetch(`/api/skills/${execSkill.id}/executar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: execInput }),
      });
      if (!res.ok) throw new Error('Erro ao executar skill');
      const data = await res.json();
      setExecResult(data.resultado || data.output || JSON.stringify(data, null, 2));
    } catch (e) {
      setExecResult('Erro: ' + e.message);
    } finally {
      setExecuting(false);
    }
  }

  useEffect(() => {
    fetchSkills();
  }, []);

  return (
    <div className="container">
      <div className="header">
        <h2 className="title">Skills</h2>
        <button className="btn-new" onClick={() => { setShowNew(true); setForm(EMPTY_FORM); }}>
          + Nova Skill
        </button>
      </div>

      {error && <div className="error-bar">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Carregando skills...</span>
        </div>
      ) : skills.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <p>Nenhuma skill cadastrada ainda.</p>
        </div>
      ) : (
        <div className="skills-grid">
          {skills.map((skill) => (
            <div key={skill.id} className="skill-card">
              <div className="skill-top">
                <div>
                  <div className="skill-titulo">{skill.titulo || skill.nome}</div>
                  <div className="skill-slug">/{skill.slug}</div>
                </div>
                <div className="skill-actions">
                  <button className="btn-exec" onClick={() => { setExecSkill(skill); setExecInput(''); setExecResult(null); }}>
                    ▶ Executar
                  </button>
                  <button className="btn-del" onClick={() => handleDelete(skill.id)}>
                    🗑
                  </button>
                </div>
              </div>
              {skill.descricao && (
                <div className="skill-desc">{skill.descricao}</div>
              )}
              {skill.matchers && skill.matchers.length > 0 && (
                <div className="matchers">
                  {skill.matchers.map((m) => (
                    <span key={m} className="matcher-tag">{m}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Skill */}
      {showNew && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setShowNew(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Nova Skill</h3>
              <button className="modal-close" onClick={() => setShowNew(false)}>×</button>
            </div>
            <div className="modal-body">
              <label className="field-label">Slug *</label>
              <input
                className="field-input"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="ex: qualificar-lead"
              />
              <label className="field-label">Título *</label>
              <input
                className="field-input"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Nome legível da skill"
              />
              <label className="field-label">Descrição</label>
              <input
                className="field-input"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Breve descrição"
              />
              <label className="field-label">Prompt Template</label>
              <textarea
                className="field-textarea"
                value={form.prompt_template}
                onChange={(e) => setForm({ ...form, prompt_template: e.target.value })}
                placeholder="Template do prompt... use {{input}} para o input do usuário"
                rows={6}
              />
              <label className="field-label">Matchers</label>
              <TagInput
                value={form.matchers}
                onChange={(v) => setForm({ ...form, matchers: v })}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowNew(false)}>Cancelar</button>
              <button
                className="btn-save"
                onClick={handleSave}
                disabled={saving || !form.slug || !form.titulo}
              >
                {saving ? 'Salvando...' : 'Salvar Skill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Executar */}
      {execSkill && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setExecSkill(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">▶ {execSkill.titulo || execSkill.nome}</h3>
              <button className="modal-close" onClick={() => setExecSkill(null)}>×</button>
            </div>
            <div className="modal-body">
              <label className="field-label">Input</label>
              <textarea
                className="field-textarea"
                value={execInput}
                onChange={(e) => setExecInput(e.target.value)}
                placeholder="Digite o input para a skill..."
                rows={4}
              />
              <button
                className="btn-exec-run"
                onClick={handleExecutar}
                disabled={executing}
              >
                {executing ? (
                  <span className="exec-loading"><span className="spinner-sm" />Executando...</span>
                ) : (
                  '▶ Executar'
                )}
              </button>
              {execResult && (
                <div className={`exec-result${executing ? '' : ' show'}`}>
                  <div className="exec-result-label">Resultado</div>
                  <pre className="exec-result-text">{execResult}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .container {
          padding: 24px;
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
        .btn-new {
          background: #eab308;
          color: #0f172a;
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .btn-new:hover {
          opacity: 0.85;
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
          font-size: 40px;
        }
        .spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #1e293b;
          border-top-color: #eab308;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        .spinner-sm {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(15,23,42,0.4);
          border-top-color: #0f172a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .skills-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        .skill-card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 18px 20px;
          transition: border-color 0.2s;
        }
        .skill-card:hover {
          border-color: #334155;
        }
        .skill-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .skill-titulo {
          font-size: 15px;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 2px;
        }
        .skill-slug {
          font-size: 12px;
          color: #eab308;
          font-family: monospace;
        }
        .skill-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .btn-exec {
          background: transparent;
          border: 1px solid #eab308;
          color: #eab308;
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-exec:hover {
          background: #eab30820;
        }
        .btn-del {
          background: transparent;
          border: 1px solid #374151;
          color: #64748b;
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 13px;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .btn-del:hover {
          border-color: #ef4444;
          color: #ef4444;
        }
        .skill-desc {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 10px;
          line-height: 1.5;
        }
        .matchers {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .matcher-tag {
          background: #1e293b;
          border: 1px solid #eab308;
          color: #eab308;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 20px;
        }
        /* Overlay / Modal */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
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
          max-width: 560px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #1e293b;
        }
        .modal-title {
          font-size: 16px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }
        .modal-close {
          background: none;
          border: none;
          color: #64748b;
          font-size: 22px;
          cursor: pointer;
          line-height: 1;
          padding: 0 4px;
        }
        .modal-close:hover {
          color: #f8fafc;
        }
        .modal-body {
          padding: 20px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex: 1;
        }
        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #1e293b;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
          margin-bottom: -8px;
        }
        .field-input {
          width: 100%;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 10px 12px;
          color: #f8fafc;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .field-input:focus {
          border-color: #eab308;
        }
        .field-textarea {
          width: 100%;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 10px 12px;
          color: #f8fafc;
          font-size: 13px;
          outline: none;
          resize: vertical;
          box-sizing: border-box;
          font-family: monospace;
          transition: border-color 0.15s;
        }
        .field-textarea:focus {
          border-color: #eab308;
        }
        .btn-cancel {
          background: transparent;
          border: 1px solid #1e293b;
          color: #64748b;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          cursor: pointer;
        }
        .btn-cancel:hover {
          border-color: #334155;
          color: #f8fafc;
        }
        .btn-save {
          background: #eab308;
          color: #0f172a;
          border: none;
          border-radius: 8px;
          padding: 8px 20px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-exec-run {
          background: #eab308;
          color: #0f172a;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          transition: opacity 0.2s;
        }
        .btn-exec-run:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .exec-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .exec-result {
          background: #020617;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 16px;
          animation: fadeIn 0.3s ease;
        }
        .exec-result.show {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .exec-result-label {
          font-size: 11px;
          font-weight: 600;
          color: #eab308;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }
        .exec-result-text {
          color: #94a3b8;
          font-size: 13px;
          font-family: monospace;
          white-space: pre-wrap;
          word-break: break-word;
          margin: 0;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}
