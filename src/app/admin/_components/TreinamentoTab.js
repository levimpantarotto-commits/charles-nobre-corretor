'use client';

import { useState, useEffect } from 'react';

const CATEGORIAS = [
  { value: 'dna_charles', label: 'DNA Charles' },
  { value: 'argumentos', label: 'Argumentos' },
  { value: 'contratos', label: 'Contratos' },
  { value: 'regiao', label: 'Região' },
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'regras', label: 'Regras' },
  { value: 'outros', label: 'Outros' },
];

const CAT_LABELS = Object.fromEntries(CATEGORIAS.map((c) => [c.value, c.label]));

function AccordionItem({ categoria, items, onToggle, onRemove }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="accordion-item">
      <button className="accordion-header" onClick={() => setOpen(!open)}>
        <span className="acc-label">
          {CAT_LABELS[categoria] || categoria}
          <span className="acc-count">{items.length}</span>
        </span>
        <span className="acc-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="accordion-body">
          {items.length === 0 ? (
            <div className="acc-empty">Nenhum item nesta categoria.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="knowledge-item">
                <div className="ki-info">
                  <div className="ki-title">{item.titulo || item.title}</div>
                  {item.conteudo && (
                    <div className="ki-preview">
                      {(item.conteudo || item.content || '').slice(0, 120)}...
                    </div>
                  )}
                </div>
                <div className="ki-actions">
                  <button
                    className={`toggle-btn${item.ativo !== false ? ' active' : ''}`}
                    onClick={() => onToggle(item.id, item.ativo !== false)}
                    title={item.ativo !== false ? 'Desativar' : 'Ativar'}
                  >
                    {item.ativo !== false ? '● Ativo' : '○ Inativo'}
                  </button>
                  <button className="remove-btn" onClick={() => onRemove(item.id)}>
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      <style jsx>{`
        .accordion-item {
          border: 1px solid #1e293b;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .accordion-header {
          width: 100%;
          background: #0f172a;
          border: none;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          color: #f8fafc;
          font-size: 14px;
          font-weight: 600;
          text-align: left;
          transition: background 0.15s;
        }
        .accordion-header:hover {
          background: #111827;
        }
        .acc-label {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .acc-count {
          background: #1e293b;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          padding: 1px 7px;
          border-radius: 20px;
        }
        .acc-arrow {
          color: #64748b;
          font-size: 11px;
        }
        .accordion-body {
          background: #080e1a;
          padding: 12px 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .acc-empty {
          color: #64748b;
          font-size: 13px;
          padding: 8px 0;
        }
        .knowledge-item {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 12px 14px;
        }
        .ki-info {
          flex: 1;
          min-width: 0;
        }
        .ki-title {
          font-size: 14px;
          font-weight: 600;
          color: #f8fafc;
          margin-bottom: 4px;
        }
        .ki-preview {
          font-size: 12px;
          color: #64748b;
          line-height: 1.4;
        }
        .ki-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
          align-items: center;
        }
        .toggle-btn {
          background: transparent;
          border: 1px solid #374151;
          color: #64748b;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .toggle-btn.active {
          border-color: #16a34a;
          color: #4ade80;
        }
        .toggle-btn:hover {
          border-color: #eab308;
          color: #eab308;
        }
        .remove-btn {
          background: transparent;
          border: 1px solid #374151;
          color: #64748b;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .remove-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}

function BaseConhecimento() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ categoria: 'dna_charles', titulo: '', conteudo: '' });
  const [saving, setSaving] = useState(false);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch('/api/treinamento');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.items || data.conhecimento || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id, atualAtivo) {
    try {
      await fetch(`/api/treinamento/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !atualAtivo }),
      });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ativo: !atualAtivo } : i)));
    } catch (e) {
      alert('Erro ao alterar item');
    }
  }

  async function handleRemove(id) {
    if (!confirm('Remover este item?')) return;
    try {
      await fetch(`/api/treinamento/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      alert('Erro ao remover');
    }
  }

  async function handleAdd() {
    if (!form.titulo || !form.conteudo) return;
    setSaving(true);
    try {
      const res = await fetch('/api/treinamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      await fetchItems();
      setShowAdd(false);
      setForm({ categoria: 'dna_charles', titulo: '', conteudo: '' });
    } catch {
      alert('Erro ao adicionar');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { fetchItems(); }, []);

  const grouped = CATEGORIAS.reduce((acc, cat) => {
    acc[cat.value] = items.filter((i) => i.categoria === cat.value);
    return acc;
  }, {});

  return (
    <div>
      <div className="bc-header">
        <span className="bc-count">{items.length} itens</span>
        <button className="btn-add" onClick={() => setShowAdd(true)}>+ Adicionar</button>
      </div>

      {loading ? (
        <div className="bc-loading"><div className="spinner" />Carregando...</div>
      ) : (
        <div>
          {CATEGORIAS.map((cat) => (
            <AccordionItem
              key={cat.value}
              categoria={cat.value}
              items={grouped[cat.value] || []}
              onToggle={handleToggle}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Adicionar Conhecimento</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div className="modal-body">
              <label className="field-label">Categoria</label>
              <select
                className="field-select"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <label className="field-label">Título *</label>
              <input
                className="field-input"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Título do conteúdo"
              />
              <label className="field-label">Conteúdo *</label>
              <textarea
                className="field-textarea"
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                placeholder="Conteúdo de treinamento..."
                rows={6}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button
                className="btn-save"
                onClick={handleAdd}
                disabled={saving || !form.titulo || !form.conteudo}
              >
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .bc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .bc-count {
          font-size: 13px;
          color: #64748b;
        }
        .btn-add {
          background: #eab308;
          color: #0f172a;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-add:hover { opacity: 0.85; }
        .bc-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #64748b;
          font-size: 14px;
          padding: 20px 0;
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #1e293b;
          border-top-color: #eab308;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
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
          max-width: 540px;
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
        }
        .modal-close:hover { color: #f8fafc; }
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
        .field-input, .field-select {
          width: 100%;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 10px 12px;
          color: #f8fafc;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
        }
        .field-input:focus, .field-select:focus { border-color: #eab308; }
        .field-select option { background: #0f172a; }
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
          font-family: inherit;
        }
        .field-textarea:focus { border-color: #eab308; }
        .btn-cancel {
          background: transparent;
          border: 1px solid #1e293b;
          color: #64748b;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          cursor: pointer;
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
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

function Qualidade() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  async function fetchQualidade() {
    setLoading(true);
    try {
      const res = await fetch('/api/qualidade');
      if (!res.ok) throw new Error();
      const d = await res.json();
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleAprovar(id) {
    try {
      await fetch(`/api/qualidade/regras/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'aprovada' }),
      });
      setData((prev) => ({
        ...prev,
        regras_propostas: prev.regras_propostas.map((r) =>
          r.id === id ? { ...r, status: 'aprovada' } : r
        ),
      }));
    } catch {
      alert('Erro ao aprovar');
    }
  }

  async function handleRejeitar(id) {
    try {
      await fetch(`/api/qualidade/regras/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejeitada' }),
      });
      setData((prev) => ({
        ...prev,
        regras_propostas: prev.regras_propostas.filter((r) => r.id !== id),
      }));
    } catch {
      alert('Erro ao rejeitar');
    }
  }

  async function handleAnalisar() {
    if (!phone) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/qualidade/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: phone }),
      });
      if (!res.ok) throw new Error('Erro ao analisar');
      const d = await res.json();
      setAnalysisResult(d);
    } catch (e) {
      setAnalysisResult({ erro: e.message });
    } finally {
      setAnalyzing(false);
    }
  }

  useEffect(() => { fetchQualidade(); }, []);

  return (
    <div>
      {/* Score Card */}
      <div className="score-card">
        <div className="score-label">Score Médio</div>
        {loading ? (
          <div className="score-loading">Carregando...</div>
        ) : data?.score_medio != null ? (
          <div className="score-value">{data.score_medio}<span className="score-total">/10</span></div>
        ) : (
          <div className="score-na">N/A</div>
        )}
        {data?.total_analises != null && (
          <div className="score-sub">{data.total_analises} análises</div>
        )}
      </div>

      {/* Analisar Conversa */}
      <div className="section">
        <div className="section-title">Analisar Conversa</div>
        <div className="analyze-row">
          <input
            className="phone-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ex: 5511999999999"
          />
          <button
            className="btn-analyze"
            onClick={handleAnalisar}
            disabled={analyzing || !phone}
          >
            {analyzing ? 'Analisando...' : 'Analisar'}
          </button>
        </div>
        {analysisResult && (
          <div className="analysis-result">
            {analysisResult.erro ? (
              <span className="result-error">{analysisResult.erro}</span>
            ) : (
              <pre className="result-pre">{JSON.stringify(analysisResult, null, 2)}</pre>
            )}
          </div>
        )}
      </div>

      {/* Regras Propostas */}
      <div className="section">
        <div className="section-title">Regras Propostas</div>
        {loading ? (
          <div className="sect-loading">Carregando...</div>
        ) : !data?.regras_propostas?.length ? (
          <div className="sect-empty">Nenhuma regra proposta no momento.</div>
        ) : (
          <div className="regras-list">
            {data.regras_propostas.map((regra) => (
              <div key={regra.id} className="regra-item">
                <div className="regra-text">{regra.descricao || regra.texto}</div>
                <div className="regra-actions">
                  <button className="btn-aprovar" onClick={() => handleAprovar(regra.id)}>
                    ✓ Aprovar
                  </button>
                  <button className="btn-rejeitar" onClick={() => handleRejeitar(regra.id)}>
                    ✕ Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .score-card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          margin-bottom: 24px;
        }
        .score-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }
        .score-value {
          font-size: 48px;
          font-weight: 800;
          color: #eab308;
          line-height: 1;
        }
        .score-total {
          font-size: 20px;
          color: #64748b;
        }
        .score-na {
          font-size: 32px;
          color: #64748b;
          font-weight: 700;
        }
        .score-loading, .score-na {
          margin: 8px 0;
        }
        .score-sub {
          font-size: 13px;
          color: #64748b;
          margin-top: 6px;
        }
        .section {
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 12px;
        }
        .analyze-row {
          display: flex;
          gap: 10px;
        }
        .phone-input {
          flex: 1;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 10px 14px;
          color: #f8fafc;
          font-size: 14px;
          outline: none;
        }
        .phone-input:focus { border-color: #eab308; }
        .btn-analyze {
          background: #eab308;
          color: #0f172a;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn-analyze:disabled { opacity: 0.5; cursor: not-allowed; }
        .analysis-result {
          margin-top: 12px;
          background: #020617;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 14px;
        }
        .result-error { color: #fca5a5; font-size: 13px; }
        .result-pre {
          color: #94a3b8;
          font-size: 12px;
          font-family: monospace;
          white-space: pre-wrap;
          margin: 0;
        }
        .sect-loading, .sect-empty {
          color: #64748b;
          font-size: 13px;
          padding: 12px 0;
        }
        .regras-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .regra-item {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .regra-text {
          flex: 1;
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.5;
        }
        .regra-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .btn-aprovar {
          background: transparent;
          border: 1px solid #16a34a;
          color: #4ade80;
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-aprovar:hover { background: #16a34a20; }
        .btn-rejeitar {
          background: transparent;
          border: 1px solid #dc2626;
          color: #f87171;
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-rejeitar:hover { background: #dc262620; }
      `}</style>
    </div>
  );
}

export default function TreinamentoTab() {
  const [tab, setTab] = useState('base');

  return (
    <div className="container">
      <div className="header">
        <h2 className="title">Treinamento</h2>
      </div>

      <div className="inner-tabs">
        <button
          className={`inner-tab${tab === 'base' ? ' active' : ''}`}
          onClick={() => setTab('base')}
        >
          Base de Conhecimento
        </button>
        <button
          className={`inner-tab${tab === 'qualidade' ? ' active' : ''}`}
          onClick={() => setTab('qualidade')}
        >
          Qualidade
        </button>
      </div>

      <div className="tab-content">
        {tab === 'base' ? <BaseConhecimento /> : <Qualidade />}
      </div>

      <style jsx>{`
        .container {
          padding: 24px;
        }
        .header {
          margin-bottom: 20px;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }
        .inner-tabs {
          display: flex;
          gap: 4px;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 10px;
          padding: 4px;
          width: fit-content;
          margin-bottom: 24px;
        }
        .inner-tab {
          background: transparent;
          border: none;
          color: #64748b;
          padding: 8px 18px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .inner-tab:hover {
          color: #f8fafc;
        }
        .inner-tab.active {
          background: #eab308;
          color: #0f172a;
        }
        .tab-content {
          /* padding handled by children */
        }
      `}</style>
    </div>
  );
}
