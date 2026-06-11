'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Play,
  Download,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

const MAX_CHARS = 2000;

export default function VozTab() {
  const [status, setStatus] = useState(null);
  const [vozes, setVozes] = useState([]);
  const [voiceId, setVoiceId] = useState('');
  const [texto, setTexto] = useState('');
  const [gerando, setGerando] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef(null);

  async function carregarStatus() {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch('/api/voz/status', { cache: 'no-store' });
      const data = await r.json();
      setStatus(data);
      if (data.voice_id) setVoiceId(data.voice_id);
      if (data.ativo) {
        try {
          const rv = await fetch('/api/voz/vozes', { cache: 'no-store' });
          if (rv.ok) {
            const dv = await rv.json();
            setVozes(dv.vozes || []);
            if (!data.voice_id && dv.vozes?.length) {
              setVoiceId(dv.vozes[0].id);
            }
          }
        } catch {
          /* lista de vozes opcional */
        }
      }
    } catch (e) {
      setErro('Falha ao consultar status: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarStatus();
  }, []);

  async function handleGerar() {
    if (!texto.trim()) {
      setErro('Digite o texto antes de gerar.');
      return;
    }
    setGerando(true);
    setErro(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    try {
      const r = await fetch('/api/voz/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto,
          voice_id: voiceId || undefined,
          model_id: status?.modelo,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.erro || `Erro ${r.status}`);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setTimeout(() => {
        if (audioRef.current) audioRef.current.play().catch(() => {});
      }, 100);
    } catch (e) {
      setErro(e.message);
    } finally {
      setGerando(false);
    }
  }

  function handleBaixar() {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voz_${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const ativo = !!status?.ativo;

  return (
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="header"
      >
        <div className="header-left">
          <div className="icon-wrap">
            <Mic size={20} />
          </div>
          <div>
            <h2 className="title">Voz</h2>
            <p className="subtitle">
              Gere áudios em voz natural para responder leads no WhatsApp
            </p>
          </div>
        </div>
      </motion.div>

      {/* Card de Status */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="status-card status-loading"
          >
            <Loader2 size={18} className="spin" />
            <span>Consultando integração...</span>
          </motion.div>
        ) : ativo ? (
          <motion.div
            key="ativo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="status-card status-on"
          >
            <div className="status-row">
              <CheckCircle size={18} color="#22c55e" />
              <span className="status-label">Conectado</span>
              <span className="status-badge">ElevenLabs</span>
            </div>
            <div className="status-meta">
              <div>
                <span className="meta-label">voice_id:</span>{' '}
                <code>{status.voice_id || '—'}</code>
              </div>
              <div>
                <span className="meta-label">modelo:</span>{' '}
                <code>{status.modelo}</code>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="inativo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="status-card status-off"
          >
            <div className="status-off-head">
              <AlertTriangle size={22} color="#eab308" />
              <strong>ElevenLabs não configurado</strong>
            </div>
            <p className="status-off-text">
              Configure as variáveis <code>ELEVENLABS_API_KEY</code> e{' '}
              <code>ELEVENLABS_VOICE_ID</code> no Coolify e faça redeploy
              para habilitar a geração de áudio.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {erro && <div className="error-bar">{erro}</div>}

      {/* Editor */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className={`editor${!ativo ? ' editor-disabled' : ''}`}
      >
        {!ativo && (
          <div className="overlay">
            <span>Aguardando configuração da chave</span>
          </div>
        )}

        <div className="field">
          <label className="field-label">Voz</label>
          <select
            className="select"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            disabled={!ativo || vozes.length === 0}
          >
            {vozes.length === 0 ? (
              <option value="">
                {ativo ? 'Nenhuma voz disponível' : '—'}
              </option>
            ) : (
              vozes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.category ? `(${v.category})` : ''}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="field">
          <div className="label-row">
            <label className="field-label">Texto</label>
            <span
              className={`counter${
                texto.length > MAX_CHARS ? ' counter-over' : ''
              }`}
            >
              {texto.length}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            className="textarea"
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Digite o texto que será convertido em áudio..."
            rows={8}
            disabled={!ativo}
          />
        </div>

        <div className="actions">
          <button
            className="btn-gerar"
            onClick={handleGerar}
            disabled={!ativo || gerando || !texto.trim()}
          >
            {gerando ? (
              <>
                <Loader2 size={16} className="spin" /> Gerando...
              </>
            ) : (
              <>
                <Play size={16} /> Gerar áudio
              </>
            )}
          </button>
        </div>

        <AnimatePresence>
          {audioUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="result"
            >
              <div className="result-label">Resultado</div>
              <audio
                ref={audioRef}
                controls
                src={audioUrl}
                className="player"
              />
              <button className="btn-download" onClick={handleBaixar}>
                <Download size={14} /> Baixar MP3
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style jsx>{`
        .container {
          padding: 24px;
          min-height: 100%;
          color: #f8fafc;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #0f172a;
          border: 1px solid #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #eab308;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }
        .subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 2px 0 0;
        }

        .status-card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 16px;
        }
        .status-loading {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
          font-size: 14px;
        }
        .status-on {
          border-color: #14532d;
          background: linear-gradient(180deg, #0f172a 0%, #0f1e15 100%);
        }
        .status-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .status-label {
          font-weight: 600;
          color: #f8fafc;
          font-size: 14px;
        }
        .status-badge {
          background: #14532d;
          color: #86efac;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .status-meta {
          display: flex;
          gap: 24px;
          margin-top: 10px;
          font-size: 12px;
          color: #94a3b8;
        }
        .meta-label {
          color: #64748b;
          font-weight: 500;
        }
        .status-meta code {
          color: #eab308;
          background: #020617;
          padding: 1px 6px;
          border-radius: 4px;
          font-family: ui-monospace, monospace;
          font-size: 11px;
        }

        .status-off {
          border-color: #422006;
          background: linear-gradient(180deg, #0f172a 0%, #1c1408 100%);
        }
        .status-off-head {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #fde68a;
          font-size: 15px;
          margin-bottom: 8px;
        }
        .status-off-text {
          font-size: 13px;
          color: #cbd5e1;
          margin: 0;
          line-height: 1.6;
        }
        .status-off-text code {
          background: #020617;
          color: #eab308;
          padding: 1px 6px;
          border-radius: 4px;
          font-family: ui-monospace, monospace;
          font-size: 12px;
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

        .editor {
          position: relative;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .editor-disabled {
          opacity: 0.55;
        }
        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(2, 6, 23, 0.35);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
          font-size: 13px;
          color: #94a3b8;
          font-weight: 500;
          backdrop-filter: blur(1px);
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .counter {
          font-size: 11px;
          color: #64748b;
          font-variant-numeric: tabular-nums;
        }
        .counter-over {
          color: #f87171;
        }
        .select,
        .textarea {
          background: #020617;
          border: 1px solid #1e293b;
          color: #f8fafc;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
        }
        .select:focus,
        .textarea:focus {
          border-color: #eab308;
        }
        .textarea {
          resize: vertical;
          min-height: 140px;
          line-height: 1.5;
        }
        .select:disabled,
        .textarea:disabled {
          cursor: not-allowed;
        }

        .actions {
          display: flex;
          gap: 10px;
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
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: opacity 0.2s;
        }
        .btn-gerar:hover:not(:disabled) {
          opacity: 0.88;
        }
        .btn-gerar:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .result {
          border-top: 1px solid #1e293b;
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow: hidden;
        }
        .result-label {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .player {
          width: 100%;
        }
        .btn-download {
          align-self: flex-start;
          background: #020617;
          color: #eab308;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: border-color 0.15s;
        }
        .btn-download:hover {
          border-color: #eab308;
        }

        .spin {
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
