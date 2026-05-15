'use client';
import { useState, useEffect } from 'react';
import { Check, X, Clock, RefreshCw, Inbox } from 'lucide-react';

export default function ApprovalsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/approvals?status=${filter}`, { credentials: 'include' });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [filter]);

  const decide = async (id, decision) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch(`/api/approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ decision }),
      });
    } catch (err) {
      console.error(err);
      refresh();
    }
  };

  return (
    <div className="wrap">
      <div className="head">
        <div>
          <h2>Aprovações</h2>
          <p>{filter === 'pending' ? `${items.length} pendente${items.length === 1 ? '' : 's'}` : 'Histórico'}</p>
        </div>
        <div className="head-tools">
          <div className="filter-group">
            <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Pendentes</button>
            <button className={filter === 'approved' ? 'active' : ''} onClick={() => setFilter('approved')}>Aprovadas</button>
            <button className={filter === 'rejected' ? 'active' : ''} onClick={() => setFilter('rejected')}>Rejeitadas</button>
          </div>
          <button className="refresh" onClick={refresh}><RefreshCw size={14} /></button>
        </div>
      </div>

      {loading ? (
        <p className="loading">Carregando...</p>
      ) : items.length === 0 ? (
        <div className="empty">
          <Inbox size={36} />
          <p>{filter === 'pending' ? 'Nada precisa da sua aprovação agora.' : 'Sem histórico.'}</p>
          <small>Quando você ligar o Maestro IA, ações sensíveis (mandar mensagem em nome do corretor, etc) vão aparecer aqui pra aprovar antes de sair.</small>
        </div>
      ) : (
        <div className="list">
          {items.map((it) => (
            <div key={it.id} className="item">
              <div className="item-head">
                <span className="agent">{it.agent}</span>
                <span className="dot">•</span>
                <span className="action">{it.action}</span>
                <span className="time"><Clock size={11} /> {new Date(it.created_at).toLocaleString('pt-BR')}</span>
              </div>
              {it.payload && (
                <pre className="payload">{JSON.stringify(it.payload, null, 2)}</pre>
              )}
              {filter === 'pending' && (
                <div className="actions">
                  <button className="approve" onClick={() => decide(it.id, 'approved')}>
                    <Check size={14} /> Aprovar
                  </button>
                  <button className="reject" onClick={() => decide(it.id, 'rejected')}>
                    <X size={14} /> Rejeitar
                  </button>
                </div>
              )}
              {filter !== 'pending' && (
                <div className="decided">
                  Decidido por <strong>{it.decided_by || 'admin'}</strong> em {it.decided_at ? new Date(it.decided_at).toLocaleString('pt-BR') : '—'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .wrap { padding: 2rem; max-width: 900px; }
        .head { display: flex; justify-content: space-between; align-items: end; margin-bottom: 1.5rem; }
        .head h2 { font-size: 1.8rem; font-weight: 900; color: #f8fafc; letter-spacing: -1px; }
        .head p { color: #64748b; font-size: 0.85rem; margin-top: 0.3rem; }
        .head-tools { display: flex; gap: 0.5rem; align-items: center; }
        .filter-group { display: flex; gap: 2px; background: #0f172a; border: 1px solid #1e293b; padding: 3px; border-radius: 8px; }
        .filter-group button { background: transparent; border: none; color: #94a3b8; padding: 0.4rem 0.8rem; font-size: 0.75rem; font-weight: 800; cursor: pointer; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.05em; }
        .filter-group button.active { background: #eab308; color: #020617; }
        .refresh { background: #0f172a; border: 1px solid #1e293b; padding: 0.55rem; border-radius: 8px; color: #94a3b8; cursor: pointer; }

        .empty { padding: 4rem; text-align: center; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 0.8rem; background: #070b14; border: 1px solid #1e293b; border-radius: 14px; }
        .empty p { color: #94a3b8; font-weight: 800; margin-top: 0.5rem; }
        .empty small { color: #475569; max-width: 480px; line-height: 1.4; }
        .loading { padding: 4rem; text-align: center; color: #64748b; }

        .list { display: flex; flex-direction: column; gap: 0.8rem; }
        .item { background: #070b14; border: 1px solid #1e293b; border-radius: 12px; padding: 1.2rem; }
        .item-head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.8rem; font-size: 0.8rem; }
        .agent { color: #eab308; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.7rem; }
        .dot { color: #1e293b; }
        .action { color: #f8fafc; font-weight: 800; }
        .time { margin-left: auto; color: #64748b; font-size: 0.7rem; display: flex; align-items: center; gap: 4px; }
        .payload { background: #020617; border: 1px solid #1e293b; padding: 0.8rem; border-radius: 8px; font-size: 0.7rem; color: #cbd5e1; overflow-x: auto; margin-bottom: 0.8rem; }
        .actions { display: flex; gap: 0.5rem; }
        .actions button { display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1rem; border-radius: 8px; font-weight: 900; font-size: 0.75rem; cursor: pointer; border: none; text-transform: uppercase; letter-spacing: 0.05em; }
        .approve { background: #22c55e; color: #052e16; }
        .approve:hover { background: #16a34a; }
        .reject { background: #1e293b; color: #ef4444; }
        .reject:hover { background: #ef4444; color: #fff; }
        .decided { font-size: 0.75rem; color: #64748b; }
      `}</style>
    </div>
  );
}
