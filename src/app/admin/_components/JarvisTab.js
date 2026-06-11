'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Trash2, MessageSquare, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SUGESTOES = [
  'Quantos leads novos hoje?',
  'Gere uma mensagem de follow-up pro João',
  'Resumo do dia',
  'Descreva o último imóvel cadastrado',
];

export default function JarvisTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('chat');
  const [pensando, setPensando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [modelo, setModelo] = useState('llama-3.3-70b-versatile');

  const msgsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [messages, pensando]);

  async function enviarMensagem(texto) {
    const msg = (texto ?? input).trim();
    if (!msg || pensando) return;

    const novasMsgs = [...messages, { role: 'user', content: msg }];
    setMessages(novasMsgs);
    setInput('');
    setPensando(true);

    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: novasMsgs.slice(-12),
          mode,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.erro || `HTTP ${r.status}`);
      setModelo(data.modelo || modelo);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.resposta || '(resposta vazia)' }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Erro: ${e.message}` }]);
    } finally {
      setPensando(false);
    }
  }

  async function toggleMic() {
    if (gravando) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setGravando(false);
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const fd = new FormData();
        fd.append('audio', blob, 'audio.webm');
        setPensando(true);
        try {
          const r = await fetch('/api/ai/transcrever', { method: 'POST', body: fd, credentials: 'include' });
          const data = await r.json();
          if (data?.texto) {
            setInput(data.texto);
            // Envia automaticamente
            await enviarMensagem(data.texto);
          } else {
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Não consegui entender o áudio.' }]);
            setPensando(false);
          }
        } catch (e) {
          setMessages((prev) => [...prev, { role: 'assistant', content: `Erro na transcrição: ${e.message}` }]);
          setPensando(false);
        }
      };
      mr.start();
      setGravando(true);
    } catch (e) {
      alert('Microfone indisponível: ' + e.message);
    }
  }

  function limpar() {
    setMessages([]);
    setInput('');
  }

  const status = gravando ? 'Escutando…' : pensando ? 'Pensando…' : 'Aguardando';

  return (
    <div className="jarvis-wrap">
      {/* COLUNA ESQUERDA */}
      <div className="orb-col">
        <div className="orb-wrap">
          <motion.div
            className="orb"
            animate={pensando
              ? { scale: [1, 1.08, 1] }
              : gravando
              ? { scale: [1, 1.05, 1] }
              : { scale: [1, 1.04, 1] }}
            transition={{
              duration: pensando ? 1.2 : gravando ? 0.7 : 3.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <div className="orb-glow" />
        </div>
        <div className={`orb-status ${pensando ? 'thinking' : gravando ? 'listening' : ''}`}>{status}</div>

        <div className="side-stats">
          <div className="stat-row"><span>Modelo</span><span className="stat-val">{modelo.split('-')[0]}-{modelo.split('-')[1] || ''}</span></div>
          <div className="stat-row"><span>Mensagens</span><span className="stat-val">{messages.length}</span></div>
          <div className="stat-row"><span>Modo</span><span className="stat-val">{mode === 'gerar' ? 'Gerar' : 'Chat'}</span></div>
          <div className="stat-row"><span>Voz</span><span className="stat-val">Whisper</span></div>
        </div>
      </div>

      {/* COLUNA DIREITA */}
      <div className="chat-col">
        <div className="chat-head">
          <div className="head-title">
            <Sparkles size={18} color="#C5A059" />
            <h2>Jarvis</h2>
            <span className="head-sub">Assistente pessoal do Charles</span>
          </div>
          <div className="head-tools">
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="mode-select">
              <option value="chat">Modo: Chat</option>
              <option value="gerar">Modo: Gerar</option>
            </select>
          </div>
        </div>

        <div className="msgs" ref={msgsRef}>
          {messages.length === 0 && (
            <div className="welcome">
              <MessageSquare size={32} color="#C5A059" />
              <h3>Pode falar comigo, Charles.</h3>
              <p>Pergunto sobre seus leads, agenda, imóveis — ou gero conteúdo no seu jeito.</p>
              <div className="sugestoes">
                {SUGESTOES.map((s) => (
                  <button key={s} className="chip" onClick={() => enviarMensagem(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bubble ${m.role === 'user' ? 'user' : 'jarvis'}`}
              >
                {m.role === 'jarvis' || m.role === 'assistant' ? (
                  <>
                    <div className="bubble-head">
                      <Sparkles size={11} /> JARVIS
                    </div>
                    <div className="md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  </>
                ) : (
                  m.content
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {pensando && (
            <div className="bubble jarvis typing">
              <span></span><span></span><span></span>
            </div>
          )}
        </div>

        <div className="input-bar">
          <button
            className={`mic-btn ${gravando ? 'active' : ''}`}
            onClick={toggleMic}
            title={gravando ? 'Parar gravação' : 'Falar'}
            disabled={pensando && !gravando}
          >
            <Mic size={18} />
          </button>
          <input
            className="text-input"
            placeholder="Pergunta, peça algo ou peça pra gerar conteúdo…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensagem();
              }
            }}
            disabled={pensando}
          />
          <button className="send-btn" onClick={() => enviarMensagem()} disabled={pensando || !input.trim()}>
            <Send size={16} />
          </button>
          <button className="clear-btn" onClick={limpar} title="Limpar conversa">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .jarvis-wrap {
          display: flex;
          height: 100vh;
          background: #020617;
          color: #f8fafc;
          overflow: hidden;
        }

        /* ORB COLUMN */
        .orb-col {
          width: 300px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2.5rem 1.5rem 1.5rem;
          border-right: 1px solid rgba(197, 160, 89, 0.12);
          background: #070b14;
        }
        .orb-wrap {
          position: relative;
          width: 200px;
          height: 200px;
          margin-top: 2rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .orb {
          width: 160px;
          height: 160px;
          border-radius: 50%;
          background: radial-gradient(circle at 38% 32%,
            #fff4c8 0%,
            #f5d585 14%,
            #d4a017 32%,
            #8a5a00 58%,
            #3a2400 82%,
            #0a0500 100%);
          box-shadow:
            0 0 24px 4px rgba(245, 197, 66, 0.55),
            0 0 60px 14px rgba(212, 160, 23, 0.45),
            0 0 120px 30px rgba(197, 160, 89, 0.25);
          z-index: 2;
        }
        .orb-glow {
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(197,160,89,0.15) 0%, transparent 70%);
          z-index: 1;
          pointer-events: none;
        }
        .orb-status {
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-weight: 800;
          color: #C5A059;
          min-height: 18px;
          transition: color 0.3s;
        }
        .orb-status.thinking { color: #60a5fa; }
        .orb-status.listening { color: #f59e0b; }

        .side-stats {
          margin-top: auto;
          width: 100%;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(197, 160, 89, 0.1);
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          padding: 6px 0;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .stat-val {
          color: #C5A059;
          font-family: 'SF Mono', Menlo, monospace;
          text-transform: none;
          letter-spacing: 0;
        }

        /* CHAT COLUMN */
        .chat-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #020617;
        }
        .chat-head {
          padding: 1.2rem 1.8rem;
          border-bottom: 1px solid rgba(197, 160, 89, 0.12);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #070b14;
        }
        .head-title { display: flex; align-items: center; gap: 0.6rem; }
        .head-title h2 { font-size: 1.1rem; font-weight: 900; color: #f8fafc; margin: 0; letter-spacing: -0.3px; }
        .head-sub { font-size: 0.7rem; color: #64748b; margin-left: 0.4rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
        .mode-select {
          background: #0f172a;
          border: 1px solid rgba(197, 160, 89, 0.25);
          color: #C5A059;
          padding: 0.45rem 0.8rem;
          border-radius: 8px;
          font-weight: 800;
          font-size: 0.75rem;
          cursor: pointer;
          outline: none;
        }

        .msgs {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem 1.8rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .msgs::-webkit-scrollbar { width: 4px; }
        .msgs::-webkit-scrollbar-thumb { background: rgba(197,160,89,0.2); border-radius: 2px; }

        .welcome {
          margin: auto;
          max-width: 480px;
          text-align: center;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.8rem;
        }
        .welcome h3 { font-size: 1.3rem; color: #f8fafc; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
        .welcome p { color: #64748b; font-size: 0.85rem; margin: 0 0 1.2rem; }
        .sugestoes { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
        .chip {
          background: rgba(197,160,89,0.08);
          border: 1px solid rgba(197,160,89,0.2);
          color: #C5A059;
          padding: 0.5rem 0.9rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }
        .chip:hover { background: rgba(197,160,89,0.18); border-color: rgba(197,160,89,0.4); }

        .bubble {
          max-width: 78%;
          padding: 0.85rem 1.1rem;
          border-radius: 14px;
          font-size: 0.9rem;
          line-height: 1.55;
        }
        .bubble.user {
          align-self: flex-end;
          background: rgba(197,160,89,0.12);
          border: 1px solid rgba(197,160,89,0.25);
          color: #f8fafc;
          border-bottom-right-radius: 3px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .bubble.jarvis {
          align-self: flex-start;
          background: #0f172a;
          border: 1px solid #1e293b;
          color: #e2e8f0;
          border-bottom-left-radius: 3px;
        }
        .bubble-head {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 900;
          color: #C5A059;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 0.5rem;
        }
        .md :global(p) { margin: 0 0 0.5rem; }
        .md :global(p:last-child) { margin-bottom: 0; }
        .md :global(ul), .md :global(ol) { margin: 0.3rem 0 0.6rem; padding-left: 1.3rem; }
        .md :global(li) { margin-bottom: 0.25rem; }
        .md :global(strong) { color: #C5A059; }
        .md :global(code) { background: #020617; padding: 1px 6px; border-radius: 4px; font-size: 0.82rem; color: #C5A059; }
        .md :global(pre) { background: #020617; padding: 0.7rem; border-radius: 6px; overflow-x: auto; }
        .md :global(table) { border-collapse: collapse; margin: 0.5rem 0; font-size: 0.82rem; }
        .md :global(th), .md :global(td) { border: 1px solid #1e293b; padding: 4px 8px; }
        .md :global(th) { background: rgba(197,160,89,0.1); color: #C5A059; }
        .md :global(a) { color: #C5A059; }

        .typing { display: flex; gap: 5px; padding: 14px 18px; }
        .typing span {
          width: 6px; height: 6px; border-radius: 50%;
          background: #C5A059;
          animation: blink 1.3s ease-in-out infinite;
        }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2px); }
        }

        /* INPUT BAR */
        .input-bar {
          padding: 1rem 1.5rem;
          background: #070b14;
          border-top: 1px solid rgba(197,160,89,0.1);
          display: flex;
          gap: 0.6rem;
          align-items: center;
        }
        .mic-btn {
          width: 44px; height: 44px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          background: radial-gradient(circle at 35% 30%, #f5c542, #8a5a00);
          color: #020617;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
          box-shadow: 0 0 14px rgba(197,160,89,0.3);
        }
        .mic-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 0 22px rgba(197,160,89,0.55); }
        .mic-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .mic-btn.active {
          background: radial-gradient(circle at 35% 30%, #fff, #ef4444);
          box-shadow: 0 0 24px rgba(239, 68, 68, 0.7);
          animation: mic-pulse 0.8s ease-in-out infinite;
        }
        @keyframes mic-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }

        .text-input {
          flex: 1;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 10px;
          padding: 0.85rem 1rem;
          color: #f8fafc;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .text-input:focus { border-color: rgba(197,160,89,0.5); }
        .text-input::placeholder { color: #475569; }
        .text-input:disabled { opacity: 0.6; }

        .send-btn {
          width: 44px; height: 44px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          background: #C5A059;
          color: #020617;
          display: flex; align-items: center; justify-content: center;
          transition: 0.2s;
        }
        .send-btn:hover:not(:disabled) { background: #eab308; }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .clear-btn {
          height: 44px;
          width: 44px;
          border-radius: 10px;
          border: 1px solid #1e293b;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: 0.2s;
        }
        .clear-btn:hover { color: #ef4444; border-color: #ef4444; }
      `}</style>
    </div>
  );
}
