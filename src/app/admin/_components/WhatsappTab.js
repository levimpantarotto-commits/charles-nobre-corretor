'use client';

import { useState, useEffect, useRef } from 'react';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function Avatar({ name }) {
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: '#1e293b',
        border: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 700,
        color: '#eab308',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function WhatsappTab() {
  const [status, setStatus] = useState(null); // null=loading, true=online, false=offline
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Checar status
  async function checkStatus() {
    try {
      const res = await fetch('/api/whatsapp?action=status');
      if (!res.ok) { setStatus(false); return; }
      const data = await res.json();
      setStatus(data.online === true || data.status === 'connected' || data.connected === true);
    } catch {
      setStatus(false);
    }
  }

  // Buscar leads
  async function fetchLeads() {
    setLoadingLeads(true);
    try {
      const res = await fetch('/api/whatsapp?action=leads');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.leads || data.contacts || [];
      setLeads(list);
      if (list.length > 0 && !selectedLead) setSelectedLead(list[0]);
    } catch {
      setLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  }

  // Buscar mensagens do lead
  async function fetchMessages(lead) {
    if (!lead) return;
    setLoadingMsgs(true);
    try {
      const phone = lead.phone || lead.telefone || lead.id;
      const res = await fetch(`/api/whatsapp?action=messages&phone=${encodeURIComponent(phone)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.messages || [];
      setMessages(list);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function handleSend() {
    if (!text.trim() || !selectedLead || sending) return;
    const phone = selectedLead.phone || selectedLead.telefone || selectedLead.id;
    const msgText = text.trim();
    setText('');
    setSending(true);

    // Otimista
    const tempMsg = {
      id: Date.now(),
      text: msgText,
      from: 'me',
      direction: 'sent',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, text: msgText }),
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setText(msgText);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  useEffect(() => {
    checkStatus();
    fetchLeads();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedLead) fetchMessages(selectedLead);
  }, [selectedLead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="container">
      {/* Status Badge */}
      <div className="top-bar">
        <h2 className="title">WhatsApp</h2>
        <div className={`status-badge${status === true ? ' online' : status === false ? ' offline' : ' loading'}`}>
          {status === null ? (
            <><span className="dot" />Verificando...</>
          ) : status ? (
            <><span className="dot" />Online</>
          ) : (
            <><span className="dot" />Offline</>
          )}
        </div>
      </div>

      {status === false && (
        <div className="offline-warn">
          ⚠️ Evolution API offline. Envio de mensagens desabilitado. Verifique a conexão.
        </div>
      )}

      <div className="layout">
        {/* Coluna esquerda: leads */}
        <div className="leads-col">
          <div className="leads-header">Leads</div>
          {loadingLeads ? (
            <div className="leads-loading"><div className="spinner" /></div>
          ) : leads.length === 0 ? (
            <div className="leads-empty">Nenhum lead encontrado</div>
          ) : (
            <div className="leads-list">
              {leads.map((lead) => {
                const name = lead.name || lead.nome || lead.phone || lead.telefone || 'Desconhecido';
                const phone = lead.phone || lead.telefone || '';
                const lastContact = lead.last_message || lead.ultimo_contato || lead.updated_at;
                const isSelected = selectedLead?.id === lead.id || selectedLead?.phone === lead.phone;
                return (
                  <button
                    key={lead.id || phone}
                    className={`lead-item${isSelected ? ' selected' : ''}`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <Avatar name={name} />
                    <div className="lead-info">
                      <div className="lead-name">{name}</div>
                      <div className="lead-phone">{phone}</div>
                    </div>
                    <div className="lead-date">{formatDate(lastContact)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna direita: conversa */}
        <div className="chat-col">
          {!selectedLead ? (
            <div className="no-chat">Selecione um lead para ver a conversa</div>
          ) : (
            <>
              <div className="chat-header">
                <Avatar name={selectedLead.name || selectedLead.nome || selectedLead.phone} />
                <div className="chat-info">
                  <div className="chat-name">
                    {selectedLead.name || selectedLead.nome || selectedLead.phone || selectedLead.telefone}
                  </div>
                  <div className="chat-phone">
                    {selectedLead.phone || selectedLead.telefone}
                  </div>
                </div>
              </div>

              <div className="messages-area">
                {loadingMsgs ? (
                  <div className="msgs-loading"><div className="spinner" /></div>
                ) : messages.length === 0 ? (
                  <div className="msgs-empty">Nenhuma mensagem ainda.</div>
                ) : (
                  messages.map((msg, i) => {
                    const isSent = msg.direction === 'sent' || msg.from === 'me' || msg.fromMe === true;
                    return (
                      <div key={msg.id || i} className={`bubble-wrap${isSent ? ' sent' : ' recv'}`}>
                        <div className={`bubble${isSent ? ' bubble-sent' : ' bubble-recv'}`}>
                          <div className="bubble-text">{msg.text || msg.body || msg.message}</div>
                          <div className="bubble-time">{formatTime(msg.created_at || msg.timestamp)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input">
                <textarea
                  className="msg-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite uma mensagem... (Enter para enviar)"
                  rows={2}
                  disabled={status === false}
                />
                <button
                  className="btn-send"
                  onClick={handleSend}
                  disabled={!text.trim() || sending || status === false}
                >
                  {sending ? '...' : '➤'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .container {
          padding: 24px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #1e293b;
          background: #0f172a;
          color: #64748b;
        }
        .status-badge.online {
          border-color: #166534;
          background: #052e16;
          color: #4ade80;
        }
        .status-badge.offline {
          border-color: #7f1d1d;
          background: #450a0a;
          color: #f87171;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          display: inline-block;
        }
        .status-badge.online .dot {
          background: #4ade80;
          box-shadow: 0 0 6px #4ade80;
          animation: pulse 2s infinite;
        }
        .status-badge.offline .dot { background: #f87171; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .offline-warn {
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
          gap: 0;
          flex: 1;
          min-height: 0;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          overflow: hidden;
          height: calc(100vh - 220px);
        }
        /* Leads col */
        .leads-col {
          width: 280px;
          flex-shrink: 0;
          border-right: 1px solid #1e293b;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .leads-header {
          padding: 14px 16px;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 1px solid #1e293b;
          background: #080e1a;
        }
        .leads-loading, .leads-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          color: #64748b;
          font-size: 13px;
        }
        .leads-list {
          flex: 1;
          overflow-y: auto;
        }
        .leads-list::-webkit-scrollbar {
          width: 4px;
        }
        .leads-list::-webkit-scrollbar-track { background: transparent; }
        .leads-list::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        .lead-item {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid #0a1120;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
        }
        .lead-item:hover { background: #111827; }
        .lead-item.selected { background: #1a1f2e; border-left: 3px solid #eab308; }
        .lead-info {
          flex: 1;
          min-width: 0;
        }
        .lead-name {
          font-size: 13px;
          font-weight: 600;
          color: #f8fafc;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lead-phone {
          font-size: 11px;
          color: #64748b;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lead-date {
          font-size: 11px;
          color: #64748b;
          flex-shrink: 0;
        }
        /* Chat col */
        .chat-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }
        .no-chat {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 14px;
        }
        .chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid #1e293b;
          background: #080e1a;
        }
        .chat-info {}
        .chat-name {
          font-size: 14px;
          font-weight: 700;
          color: #f8fafc;
        }
        .chat-phone {
          font-size: 12px;
          color: #64748b;
        }
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .messages-area::-webkit-scrollbar { width: 4px; }
        .messages-area::-webkit-scrollbar-track { background: transparent; }
        .messages-area::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        .msgs-loading, .msgs-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          color: #64748b;
          font-size: 13px;
        }
        .bubble-wrap {
          display: flex;
        }
        .bubble-wrap.sent { justify-content: flex-end; }
        .bubble-wrap.recv { justify-content: flex-start; }
        .bubble {
          max-width: 65%;
          padding: 10px 14px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .bubble-sent {
          background: #854d0e;
          border: 1px solid #92400e;
          border-bottom-right-radius: 3px;
        }
        .bubble-recv {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-bottom-left-radius: 3px;
        }
        .bubble-text {
          font-size: 13px;
          line-height: 1.5;
          word-break: break-word;
        }
        .bubble-sent .bubble-text { color: #fef3c7; }
        .bubble-recv .bubble-text { color: #cbd5e1; }
        .bubble-time {
          font-size: 10px;
          color: rgba(255,255,255,0.4);
          align-self: flex-end;
        }
        .chat-input {
          display: flex;
          gap: 10px;
          padding: 12px 16px;
          border-top: 1px solid #1e293b;
          background: #080e1a;
          align-items: flex-end;
        }
        .msg-input {
          flex: 1;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 10px;
          padding: 10px 14px;
          color: #f8fafc;
          font-size: 13px;
          outline: none;
          resize: none;
          font-family: inherit;
          transition: border-color 0.15s;
          line-height: 1.5;
        }
        .msg-input:focus { border-color: #eab308; }
        .msg-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .msg-input::placeholder { color: #475569; }
        .btn-send {
          background: #eab308;
          color: #0f172a;
          border: none;
          border-radius: 10px;
          width: 44px;
          height: 44px;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
          flex-shrink: 0;
        }
        .btn-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-send:hover:not(:disabled) { opacity: 0.85; }
        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #1e293b;
          border-top-color: #eab308;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
