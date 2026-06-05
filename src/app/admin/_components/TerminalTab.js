'use client';

import { useState, useEffect, useCallback } from 'react';

function formatRelative(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function MetricCard({ icon, title, children, highlight }) {
  return (
    <div className={`metric-card${highlight ? ' highlight' : ''}`}>
      <div className="card-icon">{icon}</div>
      <div className="card-title">{title}</div>
      <div className="card-body">{children}</div>
      <style jsx>{`
        .metric-card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 14px;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color 0.2s;
        }
        .metric-card:hover {
          border-color: #334155;
        }
        .metric-card.highlight {
          border-color: #eab30840;
        }
        .card-icon {
          font-size: 24px;
          line-height: 1;
        }
        .card-title {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
        .card-body {
          flex: 1;
        }
      `}</style>
    </div>
  );
}

function PipelineCard({ data }) {
  const statuses = data?.por_status || {};
  const total = data?.total || 0;
  const statusColors = {
    novo: '#3b82f6',
    qualificado: '#eab308',
    proposta: '#8b5cf6',
    negociacao: '#f97316',
    fechado: '#22c55e',
    perdido: '#ef4444',
  };

  return (
    <MetricCard icon="🎯" title="Pipeline de Leads" highlight={total > 0}>
      <div className="total-num">{total}</div>
      <div className="total-label">leads ativos</div>
      {Object.keys(statuses).length > 0 && (
        <div className="status-list">
          {Object.entries(statuses).map(([status, count]) => (
            <div key={status} className="status-row">
              <span
                className="status-dot"
                style={{ background: statusColors[status] || '#64748b' }}
              />
              <span className="status-name">{status}</span>
              <span className="status-count">{count}</span>
            </div>
          ))}
        </div>
      )}
      <style jsx>{`
        .total-num {
          font-size: 36px;
          font-weight: 800;
          color: #eab308;
          line-height: 1;
          margin-bottom: 2px;
        }
        .total-label {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 12px;
        }
        .status-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .status-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .status-name {
          flex: 1;
          color: #94a3b8;
          text-transform: capitalize;
        }
        .status-count {
          font-weight: 700;
          color: #f8fafc;
        }
      `}</style>
    </MetricCard>
  );
}

function CatalogoCard({ data }) {
  const charles = data?.charles || 0;
  const rokni = data?.rokni || 0;
  const total = data?.total || charles + rokni;

  return (
    <MetricCard icon="🏠" title="Catálogo">
      <div className="total-num">{total}</div>
      <div className="total-label">imóveis</div>
      <div className="brand-list">
        <div className="brand-row">
          <span className="brand-badge charles">Charles Nobre</span>
          <span className="brand-val">{charles}</span>
        </div>
        <div className="brand-row">
          <span className="brand-badge rokni">Rokni</span>
          <span className="brand-val">{rokni}</span>
        </div>
      </div>
      <style jsx>{`
        .total-num {
          font-size: 36px;
          font-weight: 800;
          color: #eab308;
          line-height: 1;
          margin-bottom: 2px;
        }
        .total-label {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 12px;
        }
        .brand-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .brand-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .brand-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 20px;
        }
        .brand-badge.charles {
          background: #1e293b;
          color: #eab308;
          border: 1px solid #eab30840;
        }
        .brand-badge.rokni {
          background: #1e293b;
          color: #94a3b8;
          border: 1px solid #334155;
        }
        .brand-val {
          font-size: 18px;
          font-weight: 700;
          color: #f8fafc;
        }
      `}</style>
    </MetricCard>
  );
}

function AgendaCard({ data }) {
  const eventos = data?.hoje || data?.events || [];
  const total = data?.total_hoje ?? eventos.length;

  return (
    <MetricCard icon="📅" title="Agenda">
      <div className="total-num">{total}</div>
      <div className="total-label">eventos hoje</div>
      {eventos.length > 0 && (
        <div className="events-list">
          {eventos.slice(0, 3).map((ev, i) => (
            <div key={ev.id || i} className="event-item">
              <div className="event-time">{ev.hora || ev.time || '--:--'}</div>
              <div className="event-name">{ev.titulo || ev.title || ev.nome}</div>
            </div>
          ))}
          {total > 3 && (
            <div className="more-events">+{total - 3} mais</div>
          )}
        </div>
      )}
      {eventos.length === 0 && (
        <div className="no-events">Nenhum evento hoje</div>
      )}
      <style jsx>{`
        .total-num {
          font-size: 36px;
          font-weight: 800;
          color: #eab308;
          line-height: 1;
          margin-bottom: 2px;
        }
        .total-label {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 12px;
        }
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .event-item {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .event-time {
          font-size: 11px;
          font-weight: 700;
          color: #eab308;
          width: 42px;
          flex-shrink: 0;
        }
        .event-name {
          font-size: 12px;
          color: #94a3b8;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .more-events {
          font-size: 11px;
          color: #64748b;
          padding-top: 2px;
        }
        .no-events {
          font-size: 13px;
          color: #64748b;
        }
      `}</style>
    </MetricCard>
  );
}

function AprovacoesCard({ data }) {
  const pendentes = data?.pendentes ?? data?.total ?? 0;

  return (
    <MetricCard icon="✅" title="Aprovações" highlight={pendentes > 0}>
      <div className={`total-num${pendentes > 0 ? ' urgent' : ''}`}>{pendentes}</div>
      <div className="total-label">pendentes</div>
      {data?.tipos && (
        <div className="tipos-list">
          {Object.entries(data.tipos).map(([tipo, count]) => (
            <div key={tipo} className="tipo-row">
              <span className="tipo-name">{tipo}</span>
              <span className="tipo-count">{count}</span>
            </div>
          ))}
        </div>
      )}
      {pendentes === 0 && (
        <div className="all-ok">Tudo em dia ✓</div>
      )}
      <style jsx>{`
        .total-num {
          font-size: 36px;
          font-weight: 800;
          color: #64748b;
          line-height: 1;
          margin-bottom: 2px;
        }
        .total-num.urgent {
          color: #f97316;
        }
        .total-label {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 12px;
        }
        .all-ok {
          font-size: 13px;
          color: #4ade80;
        }
        .tipos-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tipo-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .tipo-name {
          color: #94a3b8;
          text-transform: capitalize;
        }
        .tipo-count {
          font-weight: 700;
          color: #f97316;
        }
      `}</style>
    </MetricCard>
  );
}

function BriefingCard({ data }) {
  const date = data?.ultimo_briefing || data?.date || data?.created_at;
  const resumo = data?.resumo || data?.preview || '';

  return (
    <MetricCard icon="📋" title="Último Briefing">
      <div className="briefing-date">{formatDateTime(date)}</div>
      {resumo && (
        <div className="briefing-preview">{resumo.slice(0, 120)}{resumo.length > 120 ? '...' : ''}</div>
      )}
      {!date && (
        <div className="no-brief">Nenhum briefing gerado</div>
      )}
      <style jsx>{`
        .briefing-date {
          font-size: 15px;
          font-weight: 700;
          color: #eab308;
          margin-bottom: 8px;
        }
        .briefing-preview {
          font-size: 12px;
          color: #64748b;
          line-height: 1.5;
        }
        .no-brief {
          font-size: 13px;
          color: #64748b;
        }
      `}</style>
    </MetricCard>
  );
}

export default function TerminalTab() {
  const [liveops, setLiveops] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [error, setError] = useState(null);

  const fetchLiveops = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/liveops');
      if (!res.ok) throw new Error('Erro ao carregar dados');
      const data = await res.json();
      setLiveops(data);
      setLastUpdate(new Date());
      setSecondsAgo(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    fetchLiveops();
    const refresh = setInterval(fetchLiveops, 30000);
    return () => clearInterval(refresh);
  }, [fetchLiveops]);

  // Contador "Atualizado há Xs"
  useEffect(() => {
    if (!lastUpdate) return;
    const ticker = setInterval(() => {
      setSecondsAgo(Math.floor((new Date() - lastUpdate) / 1000));
    }, 1000);
    return () => clearInterval(ticker);
  }, [lastUpdate]);

  return (
    <div className="container">
      <div className="header">
        <h2 className="title">Terminal de Automação</h2>
        <div className="right-controls">
          {lastUpdate && (
            <span className="last-update">
              Atualizado há {secondsAgo}s
            </span>
          )}
          <button
            className={`btn-refresh${loading ? ' spinning' : ''}`}
            onClick={fetchLiveops}
            disabled={loading}
            title="Atualizar agora"
          >
            <span className="refresh-icon">↻</span>
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="error-bar">
          {error}
          <button className="retry-btn" onClick={fetchLiveops}>Tentar novamente</button>
        </div>
      )}

      {loading && !liveops ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Carregando dados em tempo real...</span>
        </div>
      ) : (
        <div className="grid">
          <PipelineCard data={liveops?.pipeline || liveops?.leads} />
          <CatalogoCard data={liveops?.catalogo || liveops?.imoveis} />
          <AgendaCard data={liveops?.agenda} />
          <AprovacoesCard data={liveops?.aprovacoes} />
          <BriefingCard data={liveops?.briefing} />
        </div>
      )}

      {/* Timestamp footer */}
      {liveops && (
        <div className="footer-bar">
          <span className="footer-dot" />
          Live Ops ativo — dados atualizados automaticamente a cada 30 segundos
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
        .right-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .last-update {
          font-size: 12px;
          color: #64748b;
        }
        .btn-refresh {
          background: transparent;
          border: 1px solid #1e293b;
          color: #94a3b8;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: border-color 0.15s, color 0.15s;
        }
        .btn-refresh:hover:not(:disabled) {
          border-color: #eab308;
          color: #eab308;
        }
        .btn-refresh:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .refresh-icon {
          font-size: 16px;
          display: inline-block;
          transition: transform 0.3s;
        }
        .btn-refresh.spinning .refresh-icon {
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .error-bar {
          background: #450a0a;
          border: 1px solid #7f1d1d;
          color: #fca5a5;
          padding: 10px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .retry-btn {
          background: transparent;
          border: 1px solid #7f1d1d;
          color: #fca5a5;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 60px 0;
          color: #64748b;
          font-size: 14px;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #1e293b;
          border-top-color: #eab308;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
        .footer-bar {
          margin-top: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #334155;
        }
        .footer-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          animation: pulse 2s infinite;
          flex-shrink: 0;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
