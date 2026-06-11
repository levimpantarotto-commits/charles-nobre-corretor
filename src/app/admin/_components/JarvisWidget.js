'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, X, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Widget flutuante do Jarvis (assistente pessoal do Charles).
 * - FAB no canto inferior direito
 * - Click abre painel de chat
 * - Orb com estados: idle | listening | thinking | speaking
 * - Modos: chat (assistente pro Charles) | gerar (texto pro cliente, usa DNA do Charles)
 * - Microfone com transcrição (Groq Whisper)
 */
export default function JarvisWidget() {
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState('idle'); // idle | listening | thinking | speaking
  const [modo, setModo] = useState('chat'); // chat | gerar
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [pensando, setPensando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const msgsRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Auto-scroll do chat
  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, pensando]);

  // Atalho ESC fecha o painel
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function enviar(textoForcado) {
    const texto = (textoForcado ?? input).trim();
    if (!texto || pensando) return;

    const novaMsg = { role: 'user', content: texto };
    const historico = [...msgs, novaMsg];
    setMsgs(historico);
    setInput('');
    setPensando(true);
    setEstado('thinking');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: historico, mode: modo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao gerar resposta');
      setMsgs([...historico, { role: 'assistant', content: data.resposta || '(sem resposta)' }]);
      setEstado('speaking');
      setTimeout(() => setEstado('idle'), 1000);
    } catch (err) {
      setMsgs([...historico, { role: 'assistant', content: `⚠ Erro: ${err.message}` }]);
      setEstado('idle');
    } finally {
      setPensando(false);
    }
  }

  async function gravarToggle() {
    if (gravando) {
      // Para a gravação
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setGravando(false);
        setEstado('thinking');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('audio', blob, 'audio.webm');
        try {
          const res = await fetch('/api/ai/transcrever', { method: 'POST', credentials: 'include', body: fd });
          const data = await res.json();
          if (data.texto) {
            await enviar(data.texto);
          } else {
            setEstado('idle');
            alert('Não consegui entender o áudio.');
          }
        } catch (e) {
          setEstado('idle');
          alert('Erro ao transcrever: ' + e.message);
        }
      };

      recorder.start();
      setGravando(true);
      setEstado('listening');
    } catch (e) {
      alert('Permissão de microfone negada ou não disponível.');
    }
  }

  function limpar() {
    setMsgs([]);
    setEstado('idle');
  }

  const sugestoes = modo === 'chat' ? [
    'Resumo do dia',
    'Quantos leads novos hoje?',
    'Qual o imóvel mais visto?',
    'Quais eventos tenho hoje?',
  ] : [
    'Mensagem de follow-up pro lead João',
    'Descrição pra anúncio do Garden Residence',
    'Responda: "está muito caro"',
    'Bom dia pros leads da semana',
  ];

  return (
    <>
      {/* FAB - botão flutuante */}
      <button
        className={`jarvis-fab ${estado}`}
        onClick={() => setAberto((v) => !v)}
        title="Jarvis - Assistente do Charles"
        aria-label="Abrir Jarvis"
      >
        <Sparkles size={26} />
      </button>

      {/* Painel de chat */}
      <AnimatePresence>
        {aberto && (
          <motion.div
            className="jarvis-panel"
            initial={{ opacity: 0, scale: 0.6, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="jp-head">
              <div className={`mini-orb ${estado}`} />
              <div className="jp-head-info">
                <strong>Jarvis</strong>
                <span className="muted">Assistente do Charles</span>
              </div>
              <div className="jp-head-actions">
                <select className="modo" value={modo} onChange={(e) => setModo(e.target.value)} title="Modo">
                  <option value="chat">Chat</option>
                  <option value="gerar">Gerar</option>
                </select>
                <button className="ic" onClick={limpar} title="Limpar conversa"><Trash2 size={14} /></button>
                <button className="ic" onClick={() => setAberto(false)} title="Fechar"><X size={14} /></button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="jp-msgs" ref={msgsRef}>
              {msgs.length === 0 && !pensando && (
                <div className="jp-vazio">
                  <Sparkles size={32} />
                  <h4>Oi, sou o Jarvis</h4>
                  <p className="muted">
                    {modo === 'chat'
                      ? 'Pergunte qualquer coisa sobre o negócio ou os imóveis.'
                      : 'Vou gerar texto no tom do Charles (DNA carregado). Use pra mensagem de lead, anúncio, etc.'}
                  </p>
                  <div className="sugs">
                    {sugestoes.map((s, i) => (
                      <button key={i} className="sug" onClick={() => enviar(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`bolha ${m.role}`}>
                  {m.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  ) : (
                    <p>{m.content}</p>
                  )}
                </div>
              ))}
              {pensando && (
                <div className="bolha assistant typing">
                  <span /><span /><span />
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="jp-input">
              <button
                className={`ic mic ${gravando ? 'rec' : ''}`}
                onClick={gravarToggle}
                disabled={pensando}
                title={gravando ? 'Parar e enviar' : 'Falar'}
              >
                <Mic size={16} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviar()}
                placeholder={modo === 'chat' ? 'Pergunte algo…' : 'O que você quer que eu escreva?'}
                disabled={pensando || gravando}
              />
              <button className="send" onClick={() => enviar()} disabled={!input.trim() || pensando}>
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        /* FAB */
        .jarvis-fab {
          position: fixed; right: 30px; bottom: 30px; width: 64px; height: 64px;
          border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffd87a 0%, #C5A059 45%, #8a6e2e 100%);
          border: none; color: #0a0a12; cursor: pointer; z-index: 9998;
          box-shadow: 0 18px 40px rgba(197,160,89,0.45), 0 0 0 6px rgba(197,160,89,0.08);
          display: flex; align-items: center; justify-content: center;
          animation: fabPulse 2.8s ease-in-out infinite;
          transition: transform .22s ease;
        }
        .jarvis-fab:hover { transform: scale(1.08); }
        @keyframes fabPulse {
          0%,100% { box-shadow: 0 18px 40px rgba(197,160,89,0.45), 0 0 0 6px rgba(197,160,89,0.06); }
          50% { box-shadow: 0 22px 50px rgba(197,160,89,0.55), 0 0 0 16px rgba(197,160,89,0.0); }
        }
        .jarvis-fab.listening { background: radial-gradient(circle at 35% 30%, #ffd1a0 0%, #ff7030 45%, #a02000 100%); }
        .jarvis-fab.thinking  { background: radial-gradient(circle at 35% 30%, #d0e8ff 0%, #60a8f0 30%, #1a4080 70%, #050f20 100%); animation: fabPulse 1.1s ease-in-out infinite; }
        .jarvis-fab.speaking  { animation: fabPulse .7s ease-in-out infinite; }

        /* Painel */
        .jarvis-panel {
          position: fixed; right: 30px; bottom: 110px; width: 420px; max-width: calc(100vw - 40px);
          height: 600px; max-height: calc(100vh - 140px);
          background: #0a0a12; border: 1px solid rgba(197,160,89,0.25);
          border-radius: 18px; z-index: 9999;
          box-shadow: 0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(197,160,89,0.05);
          display: flex; flex-direction: column; overflow: hidden;
          font-family: system-ui, -apple-system, sans-serif;
        }

        /* Header */
        .jp-head {
          display: flex; align-items: center; gap: 0.7rem; padding: 0.9rem 1rem;
          border-bottom: 1px solid rgba(197,160,89,0.1); background: #0f172a;
        }
        .jp-head-info { flex: 1; display: flex; flex-direction: column; gap: 0; }
        .jp-head-info strong { font-size: 0.9rem; color: #f8fafc; font-weight: 800; }
        .jp-head-info .muted { font-size: 0.7rem; color: #64748b; }
        .jp-head-actions { display: flex; align-items: center; gap: 0.3rem; }
        .modo {
          background: #020617; border: 1px solid #1e293b; color: #C5A059;
          padding: 0.35rem 0.55rem; border-radius: 7px; font-size: 0.72rem; font-weight: 700;
          cursor: pointer; outline: none;
        }
        .ic {
          background: transparent; border: 1px solid transparent; color: #64748b;
          width: 28px; height: 28px; border-radius: 7px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: 0.2s;
        }
        .ic:hover { background: #1e293b; color: #f8fafc; }

        /* Mini orb */
        .mini-orb {
          width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
          background: radial-gradient(circle at 40% 36%, #ffd87a 0%, #C5A059 50%, #8a6e2e 100%);
          box-shadow: 0 0 14px 2px rgba(197,160,89,0.45);
          animation: orbIdle 3s ease-in-out infinite; transition: background .4s;
        }
        @keyframes orbIdle { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        .mini-orb.listening { background: radial-gradient(circle at 40% 36%, #fff 0%, #ffcaa0 18%, #ff7030 45%, #a02000 100%); animation: orbFast .7s ease-in-out infinite; box-shadow: 0 0 14px 4px rgba(255,110,40,.85); }
        .mini-orb.thinking  { background: radial-gradient(circle at 40% 36%, #d0e8ff 0%, #60a8f0 30%, #1a4080 70%, #050f20 100%); animation: orbFast 1.1s ease-in-out infinite; box-shadow: 0 0 14px 4px rgba(60,140,240,.7); }
        @keyframes orbFast { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }

        /* Mensagens */
        .jp-msgs { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem; }
        .jp-msgs::-webkit-scrollbar { width: 6px; }
        .jp-msgs::-webkit-scrollbar-thumb { background: rgba(197,160,89,0.25); border-radius: 3px; }

        .jp-vazio {
          margin: auto; text-align: center; color: #64748b; padding: 1rem;
          display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
        }
        .jp-vazio :global(svg) { color: #C5A059; }
        .jp-vazio h4 { font-size: 1rem; color: #f8fafc; margin: 0.3rem 0 0; font-weight: 800; }
        .jp-vazio p { margin: 0; font-size: 0.8rem; max-width: 280px; }
        .sugs { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.8rem; width: 100%; }
        .sug {
          background: #0f172a; border: 1px solid rgba(197,160,89,0.15); color: #f8fafc;
          padding: 0.6rem 0.8rem; border-radius: 10px; font-size: 0.78rem; cursor: pointer;
          text-align: left; transition: 0.2s;
        }
        .sug:hover { border-color: rgba(197,160,89,0.4); background: #1e293b; }

        .bolha {
          max-width: 85%; padding: 0.7rem 0.9rem; border-radius: 14px; font-size: 0.85rem;
          line-height: 1.45;
        }
        .bolha.user {
          align-self: flex-end; background: rgba(197,160,89,0.12);
          border: 1px solid rgba(197,160,89,0.25); color: #f8fafc;
          border-bottom-right-radius: 4px;
        }
        .bolha.user p { margin: 0; }
        .bolha.assistant {
          align-self: flex-start; background: #0f172a; border: 1px solid #1e293b; color: #e2e8f0;
          border-bottom-left-radius: 4px;
        }
        .bolha.assistant :global(p) { margin: 0 0 0.5em; }
        .bolha.assistant :global(p:last-child) { margin-bottom: 0; }
        .bolha.assistant :global(ul), .bolha.assistant :global(ol) { padding-left: 1.2em; margin: 0.5em 0; }
        .bolha.assistant :global(code) { background: #020617; padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.8em; color: #C5A059; }
        .bolha.assistant :global(strong) { color: #C5A059; }

        .bolha.typing { display: flex; gap: 4px; padding: 0.9rem; }
        .bolha.typing span {
          width: 6px; height: 6px; border-radius: 50%; background: #C5A059;
          animation: typing 1.2s ease-in-out infinite;
        }
        .bolha.typing span:nth-child(2) { animation-delay: 0.15s; }
        .bolha.typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes typing { 0%,60%,100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }

        /* Input */
        .jp-input {
          padding: 0.7rem; display: flex; gap: 0.4rem; align-items: center;
          border-top: 1px solid rgba(197,160,89,0.1); background: #0f172a;
        }
        .jp-input input {
          flex: 1; background: #020617; border: 1px solid #1e293b; color: #f8fafc;
          padding: 0.7rem 0.85rem; border-radius: 10px; font-size: 0.85rem; outline: none;
          font-family: inherit;
        }
        .jp-input input:focus { border-color: rgba(197,160,89,0.5); }
        .jp-input input:disabled { opacity: 0.5; }
        .jp-input .mic, .jp-input .send {
          width: 38px; height: 38px; border-radius: 10px; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: 0.2s;
        }
        .jp-input .mic { background: #1e293b; color: #C5A059; }
        .jp-input .mic:hover:not(:disabled) { background: #334155; }
        .jp-input .mic.rec { background: #ef4444; color: #fff; animation: recPulse 1s ease-in-out infinite; }
        @keyframes recPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } }
        .jp-input .send {
          background: linear-gradient(135deg, #ffd87a 0%, #C5A059 100%); color: #0a0a12;
          font-weight: 900;
        }
        .jp-input .send:disabled { background: #1e293b; color: #64748b; cursor: not-allowed; }

        @media (max-width: 520px) {
          .jarvis-panel { right: 10px; bottom: 90px; width: calc(100vw - 20px); height: 70vh; }
          .jarvis-fab { right: 16px; bottom: 16px; }
        }
      `}</style>
    </>
  );
}
