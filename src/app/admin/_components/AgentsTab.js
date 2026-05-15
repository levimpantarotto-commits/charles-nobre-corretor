'use client';
import { Sparkles, MessageSquare, Search, Calendar as CalIcon, FileText, Users as UsersIcon } from 'lucide-react';

const AGENTS = [
  {
    id: 'maestro',
    name: 'Maestro Charles',
    role: 'Orquestrador',
    Icon: Sparkles,
    color: '#eab308',
    desc: 'Decide o que cada agente faz a cada ciclo (heurística + Gemini). Lê todo o estado: leads, agenda, imóveis.',
  },
  {
    id: 'sdr',
    name: 'SDR',
    role: 'Qualificação',
    Icon: MessageSquare,
    color: '#3b82f6',
    desc: 'Conversa com lead novo, qualifica intenção e budget, marca status. Mensagens vão pra aprovação antes de sair.',
  },
  {
    id: 'pesquisa',
    name: 'Pesquisa',
    role: 'Inteligência de Mercado',
    Icon: Search,
    color: '#22c55e',
    desc: 'Monitora preços de concorrentes, alerta sobre oportunidades, sugere imóveis pro lead com base no perfil.',
  },
  {
    id: 'agenda-bot',
    name: 'Agenda',
    role: 'Briefing diário',
    Icon: CalIcon,
    color: '#a855f7',
    desc: 'Manda resumo das 07h: leads novos da noite, eventos do dia, follow-ups pendentes.',
  },
  {
    id: 'redator',
    name: 'Redator',
    role: 'Conteúdo',
    Icon: FileText,
    color: '#f97316',
    desc: 'Escreve descrição de imóvel, post de redes sociais, e-mail pro lead. Sempre passa por aprovação.',
  },
  {
    id: 'atendimento',
    name: 'Atendimento',
    role: 'Pós-venda',
    Icon: UsersIcon,
    color: '#06b6d4',
    desc: 'Acompanha leads convertidos: documentação, vistoria, satisfação.',
  },
];

export default function AgentsTab() {
  return (
    <div className="wrap">
      <div className="head">
        <div>
          <h2>IA & Agentes</h2>
          <p>Sistema de agentes autônomos • <span className="soon-tag">EM BREVE</span></p>
        </div>
      </div>

      <div className="explain">
        <p>
          Esses agentes vão rodar em background pra fazer o trabalho repetitivo. Toda ação sensível (mandar mensagem, agendar reunião em nome do Charles) passa pela aba <strong>Aprovações</strong> antes de sair.
        </p>
        <p className="dim">
          Pra ligar: você precisa de uma chave da <strong>Gemini API</strong> (Google AI Studio, grátis pra desenvolvimento) e me passa pra plugar como variável de ambiente.
        </p>
      </div>

      <div className="agents-grid">
        {AGENTS.map(({ id, name, role, Icon, color, desc }) => (
          <div key={id} className="agent-card">
            <div className="agent-head">
              <div className="agent-icon" style={{ background: `${color}22`, color }}>
                <Icon size={20} />
              </div>
              <div>
                <h3>{name}</h3>
                <small>{role}</small>
              </div>
              <span className="status">desligado</span>
            </div>
            <p className="agent-desc">{desc}</p>
          </div>
        ))}
      </div>

      <style jsx>{`
        .wrap { padding: 2rem; }
        .head { margin-bottom: 1.5rem; }
        .head h2 { font-size: 1.8rem; font-weight: 900; color: #f8fafc; letter-spacing: -1px; }
        .head p { color: #64748b; font-size: 0.85rem; margin-top: 0.3rem; }
        .soon-tag { background: rgba(234,179,8,0.15); color: #eab308; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.1em; }

        .explain {
          background: #070b14; border: 1px solid #1e293b; border-radius: 12px;
          padding: 1.5rem; margin-bottom: 2rem; color: #cbd5e1; line-height: 1.6; font-size: 0.9rem;
        }
        .explain p { margin: 0; }
        .explain p + p { margin-top: 0.8rem; }
        .explain .dim { color: #64748b; font-size: 0.82rem; }
        .explain strong { color: #eab308; font-weight: 900; }

        .agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
        .agent-card {
          background: #070b14; border: 1px solid #1e293b; border-radius: 14px;
          padding: 1.3rem; transition: 0.2s;
        }
        .agent-card:hover { border-color: rgba(234,179,8,0.3); }
        .agent-head { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.8rem; }
        .agent-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .agent-head h3 { font-size: 0.95rem; font-weight: 900; color: #f8fafc; }
        .agent-head small { color: #64748b; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800; }
        .status {
          margin-left: auto; font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.15em;
          color: #475569; font-weight: 900; padding: 3px 8px; border: 1px solid #1e293b; border-radius: 4px;
        }
        .agent-desc { color: #94a3b8; font-size: 0.82rem; line-height: 1.5; margin: 0; }
      `}</style>
    </div>
  );
}
