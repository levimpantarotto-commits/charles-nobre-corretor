'use client';
import { useState, useEffect, useMemo } from 'react';
import { Mail, Phone, Home, Calendar, Trash2, RefreshCw, Search } from 'lucide-react';

const COLUMNS = [
  { id: 'novo', label: 'Novos', color: '#3b82f6' },
  { id: 'em_atendimento', label: 'Em Atendimento', color: '#eab308' },
  { id: 'convertido', label: 'Convertidos', color: '#22c55e' },
  { id: 'perdido', label: 'Perdidos', color: '#64748b' },
];

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function LeadCard({ lead, onDragStart, onDelete, onUpdateNotes }) {
  const [showNotes, setShowNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(lead.notes || '');
  const [saving, setSaving] = useState(false);

  const saveNotes = async () => {
    if (notesDraft === (lead.notes || '')) { setShowNotes(false); return; }
    setSaving(true);
    await onUpdateNotes(lead.id, notesDraft);
    setSaving(false);
    setShowNotes(false);
  };

  return (
    <div
      className="lead-card"
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
    >
      <div className="lead-head">
        <strong>{lead.name}</strong>
        <button className="trash" onClick={() => onDelete(lead.id)} title="Excluir">
          <Trash2 size={12} />
        </button>
      </div>
      {lead.property_title && (
        <div className="lead-row"><Home size={11} /> <span>{lead.property_title}</span></div>
      )}
      {lead.phone && (
        <a className="lead-row link" href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
          <Phone size={11} /> <span>{lead.phone}</span>
        </a>
      )}
      {lead.email && (
        <a className="lead-row link" href={`mailto:${lead.email}`}>
          <Mail size={11} /> <span>{lead.email}</span>
        </a>
      )}
      <div className="lead-row dim"><Calendar size={11} /> {formatDate(lead.created_at)}</div>

      <button className="notes-toggle" onClick={() => setShowNotes((v) => !v)}>
        {showNotes ? 'Fechar nota' : (lead.notes ? '📝 Ver nota' : '+ Adicionar nota')}
      </button>
      {showNotes && (
        <div className="notes-area">
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Anotação sobre o lead..."
            rows={3}
          />
          <button onClick={saveNotes} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      )}

      <style jsx>{`
        .lead-card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 10px;
          padding: 0.9rem;
          cursor: grab;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          transition: 0.2s;
        }
        .lead-card:hover { border-color: rgba(234,179,8,0.3); }
        .lead-card:active { cursor: grabbing; }
        .lead-head { display: flex; justify-content: space-between; align-items: start; color: #f8fafc; font-size: 0.9rem; }
        .trash { background: transparent; border: none; color: #64748b; cursor: pointer; padding: 2px; }
        .trash:hover { color: #ef4444; }
        .lead-row { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: #cbd5e1; }
        .lead-row.dim { color: #64748b; margin-top: 0.2rem; }
        .lead-row.link { color: #94a3b8; text-decoration: none; }
        .lead-row.link:hover { color: #eab308; }
        .notes-toggle {
          margin-top: 0.4rem;
          background: transparent;
          border: 1px dashed #1e293b;
          color: #64748b;
          padding: 0.4rem;
          border-radius: 6px;
          font-size: 0.7rem;
          cursor: pointer;
        }
        .notes-toggle:hover { color: #eab308; border-color: #eab308; }
        .notes-area { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.4rem; }
        .notes-area textarea {
          background: #020617;
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 0.5rem;
          color: #fff;
          font-size: 0.8rem;
          resize: vertical;
          font-family: inherit;
        }
        .notes-area button {
          background: #eab308;
          color: #020617;
          border: none;
          padding: 0.5rem;
          border-radius: 6px;
          font-weight: 900;
          font-size: 0.7rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

export default function LeadsKanban() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/leads', { credentials: 'include' });
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.email, l.phone, l.property_title].some((f) => (f || '').toLowerCase().includes(q))
    );
  }, [leads, search]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.id, []]));
    filteredLeads.forEach((l) => {
      if (map[l.status]) map[l.status].push(l);
      else map.novo.push(l);
    });
    return map;
  }, [filteredLeads]);

  const onDragStart = (_e, id) => { setDraggedId(id); };
  const onDragOver = (e, colId) => { e.preventDefault(); setDragOverCol(colId); };
  const onDragLeave = () => setDragOverCol(null);
  const onDrop = async (e, colId) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedId) return;
    const lead = leads.find((l) => l.id === draggedId);
    if (!lead || lead.status === colId) { setDraggedId(null); return; }

    // Optimistic
    setLeads((prev) => prev.map((l) => (l.id === draggedId ? { ...l, status: colId } : l)));
    setDraggedId(null);

    try {
      const res = await fetch(`/api/leads/${draggedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: colId }),
      });
      if (!res.ok) throw new Error('falha');
    } catch (err) {
      console.error(err);
      refresh();
    }
  };

  const onDelete = async (id) => {
    if (!confirm('Excluir este lead permanentemente?')) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    try {
      await fetch(`/api/leads/${id}`, { method: 'DELETE', credentials: 'include' });
    } catch (err) {
      console.error(err);
      refresh();
    }
  };

  const onUpdateNotes = async (id, notes) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, notes } : l)));
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="kanban-wrap">
      <div className="kanban-head">
        <div>
          <h2>Leads</h2>
          <p>{leads.length} contatos • arraste pra mudar status</p>
        </div>
        <div className="head-tools">
          <div className="search">
            <Search size={14} />
            <input
              placeholder="Buscar lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="refresh" onClick={refresh} title="Atualizar">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="loading">Carregando leads...</p>
      ) : leads.length === 0 ? (
        <div className="empty">
          <p>Nenhum lead capturado ainda.</p>
          <small>Quando alguém clicar em "Tenho Interesse" no site, aparece aqui.</small>
        </div>
      ) : (
        <div className="kanban-grid">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className={`kanban-col ${dragOverCol === col.id ? 'over' : ''}`}
              onDragOver={(e) => onDragOver(e, col.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, col.id)}
            >
              <div className="col-head">
                <span className="dot" style={{ background: col.color }} />
                <h3>{col.label}</h3>
                <span className="count">{grouped[col.id].length}</span>
              </div>
              <div className="col-list">
                {grouped[col.id].map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onDragStart={onDragStart}
                    onDelete={onDelete}
                    onUpdateNotes={onUpdateNotes}
                  />
                ))}
                {grouped[col.id].length === 0 && (
                  <div className="col-empty">—</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .kanban-wrap { padding: 2rem; height: 100%; display: flex; flex-direction: column; }
        .kanban-head { display: flex; justify-content: space-between; align-items: end; margin-bottom: 1.5rem; }
        .kanban-head h2 { font-size: 1.8rem; font-weight: 900; color: #f8fafc; letter-spacing: -1px; }
        .kanban-head p { color: #64748b; font-size: 0.85rem; margin-top: 0.3rem; }
        .head-tools { display: flex; gap: 0.6rem; align-items: center; }
        .search {
          display: flex; align-items: center; gap: 0.5rem;
          background: #0f172a; border: 1px solid #1e293b;
          padding: 0.5rem 0.9rem; border-radius: 8px;
          color: #64748b;
        }
        .search input {
          background: transparent; border: none; outline: none;
          color: #f8fafc; font-size: 0.85rem; width: 220px;
        }
        .refresh {
          background: #0f172a; border: 1px solid #1e293b;
          padding: 0.55rem; border-radius: 8px; color: #94a3b8; cursor: pointer;
        }
        .refresh:hover { color: #eab308; border-color: #eab308; }

        .loading, .empty { padding: 4rem; text-align: center; color: #64748b; }
        .empty p { font-weight: 800; color: #94a3b8; margin-bottom: 0.5rem; }
        .empty small { color: #475569; }

        .kanban-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          flex-grow: 1;
          overflow-y: auto;
          padding-bottom: 2rem;
        }
        @media (max-width: 1200px) { .kanban-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 700px)  { .kanban-grid { grid-template-columns: 1fr; } }

        .kanban-col {
          background: #070b14;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          min-height: 200px;
          transition: 0.2s;
        }
        .kanban-col.over {
          border-color: #eab308;
          background: rgba(234, 179, 8, 0.04);
        }
        .col-head {
          display: flex; align-items: center; gap: 0.5rem;
          padding-bottom: 0.7rem; border-bottom: 1px solid #1e293b;
        }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .col-head h3 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.15em; color: #f8fafc; font-weight: 900; }
        .count {
          margin-left: auto; background: #1e293b; color: #94a3b8;
          font-size: 0.7rem; font-weight: 900; padding: 2px 8px; border-radius: 10px;
        }
        .col-list { display: flex; flex-direction: column; gap: 0.7rem; }
        .col-empty { color: #1e293b; font-size: 0.7rem; text-align: center; padding: 1rem 0; }
      `}</style>
    </div>
  );
}
