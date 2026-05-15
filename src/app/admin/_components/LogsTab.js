'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, Terminal } from 'lucide-react';

const LEVEL_COLORS = {
  info: '#60a5fa',
  warn: '#eab308',
  error: '#ef4444',
};

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/logs?limit=200', { credentials: 'include' });
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  return (
    <div className="wrap">
      <div className="head">
        <div>
          <h2>Logs</h2>
          <p>{logs.length} eventos • atualiza automaticamente a cada 15s</p>
        </div>
        <div className="head-tools">
          <label className="toggle">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            <span>Auto-refresh</span>
          </label>
          <button className="refresh" onClick={refresh}><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="terminal">
        <div className="term-head">
          <Terminal size={14} />
          <span>activity_log</span>
          <span className="dot live" />
        </div>
        <div className="term-body">
          {loading && logs.length === 0 ? (
            <div className="loading-line">⏳ Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="empty-line">Sem atividade ainda.</div>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="line">
                <span className="time">[{formatTime(l.created_at)}]</span>
                <span className="agent">{l.agent}</span>
                <span className="level" style={{ color: LEVEL_COLORS[l.level] || '#94a3b8' }}>
                  {l.level.toUpperCase()}
                </span>
                <span className="msg">{l.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .wrap { padding: 2rem; height: 100%; display: flex; flex-direction: column; }
        .head { display: flex; justify-content: space-between; align-items: end; margin-bottom: 1.5rem; }
        .head h2 { font-size: 1.8rem; font-weight: 900; color: #f8fafc; letter-spacing: -1px; }
        .head p { color: #64748b; font-size: 0.85rem; margin-top: 0.3rem; }
        .head-tools { display: flex; gap: 0.6rem; align-items: center; }
        .toggle { display: flex; align-items: center; gap: 0.4rem; color: #94a3b8; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; }
        .toggle input { accent-color: #eab308; }
        .refresh { background: #0f172a; border: 1px solid #1e293b; padding: 0.55rem; border-radius: 8px; color: #94a3b8; cursor: pointer; }
        .refresh:hover { color: #eab308; border-color: #eab308; }

        .terminal { background: #020617; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; flex-grow: 1; display: flex; flex-direction: column; }
        .term-head { display: flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1rem; background: #070b14; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
        .dot.live { margin-left: auto; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e; }
        .term-body {
          flex-grow: 1; overflow-y: auto; padding: 1rem;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 0.78rem; line-height: 1.6;
        }
        .line { color: #cbd5e1; display: flex; gap: 0.6rem; align-items: baseline; padding: 1px 0; }
        .line:hover { background: rgba(234,179,8,0.04); }
        .time { color: #475569; }
        .agent { color: #a78bfa; font-weight: 800; min-width: 56px; }
        .level { font-weight: 900; min-width: 50px; }
        .msg { flex-grow: 1; color: #e2e8f0; word-break: break-word; }
        .loading-line, .empty-line { color: #64748b; padding: 1rem; }
      `}</style>
    </div>
  );
}
