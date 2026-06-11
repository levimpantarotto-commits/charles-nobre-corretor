'use client';
import { Building2, Users, Settings as SettingsIcon, LogOut, Calendar, CheckSquare, Terminal, Sparkles, FileText, MessageCircle, Zap, BookOpen, ClipboardList, BarChart2, ImageIcon, Mic, Bot } from 'lucide-react';

const TABS = [
  { id: 'terminal', label: 'Live Ops', Icon: BarChart2 },
  { id: 'catalog', label: 'Catálogo', Icon: Building2 },
  { id: 'leads', label: 'Leads', Icon: Users },
  { id: 'agenda', label: 'Agenda', Icon: Calendar },
  { id: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
  { id: 'approvals', label: 'Aprovações', Icon: CheckSquare },
  { id: 'briefing', label: 'Briefing', Icon: ClipboardList },
  { id: 'criativos', label: 'Criativos', Icon: ImageIcon },
  { id: 'voz', label: 'Voz', Icon: Mic },
  { id: 'skills', label: 'Skills', Icon: Zap },
  { id: 'treinamento', label: 'Treinamento', Icon: BookOpen },
  { id: 'blog', label: 'Blog', Icon: FileText },
  { id: 'agents', label: 'IA & Agentes', Icon: Sparkles },
  { id: 'logs', label: 'Logs', Icon: Terminal },
  { id: 'settings', label: 'Configurações', Icon: SettingsIcon },
];

export default function Sidebar({ activeTab, onChange, onLogout, leadsCount = 0, approvalsCount = 0 }) {
  return (
    <aside className="admin-sidebar">
      <div className="brand">
        <img src="/images/logo-trimmed.png" alt="Charles R. Nobre" />
        <div className="brand-text">
          <span className="brand-name">Charles R. Nobre</span>
          <span className="brand-sub">Painel</span>
        </div>
      </div>

      <nav className="nav-tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-tab ${activeTab === id ? 'active' : ''}`}
            onClick={() => onChange(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
            {id === 'leads' && leadsCount > 0 && (
              <span className="badge">{leadsCount}</span>
            )}
            {id === 'approvals' && approvalsCount > 0 && (
              <span className="badge">{approvalsCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>

      <style jsx>{`
        .admin-sidebar {
          width: 240px;
          flex-shrink: 0;
          background: #070b14;
          border-right: 1px solid #1e293b;
          display: flex;
          flex-direction: column;
          height: 100vh;
          padding: 1.5rem 0;
        }
        .brand {
          padding: 0 1.5rem 2rem;
          border-bottom: 1px solid #1e293b;
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }
        .brand img { height: 36px; object-fit: contain; }
        .brand-text { display: flex; flex-direction: column; }
        .brand-name { font-size: 0.85rem; font-weight: 900; color: #f8fafc; letter-spacing: -0.5px; }
        .brand-sub { font-size: 0.65rem; font-weight: 800; color: #eab308; text-transform: uppercase; letter-spacing: 0.2em; }

        .nav-tabs {
          flex-grow: 1;
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .nav-tab {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.85rem 1rem;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 10px;
          color: #94a3b8;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
          transition: 0.2s;
          text-align: left;
        }
        .nav-tab:hover {
          background: #0f172a;
          color: #f8fafc;
        }
        .nav-tab.active {
          background: rgba(234, 179, 8, 0.1);
          border-color: rgba(234, 179, 8, 0.3);
          color: #eab308;
          box-shadow: 0 0 20px rgba(234, 179, 8, 0.1);
        }
        .badge {
          margin-left: auto;
          background: #eab308;
          color: #020617;
          font-size: 0.7rem;
          font-weight: 900;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .sidebar-foot {
          padding: 1rem 1.5rem;
          border-top: 1px solid #1e293b;
        }
        .logout-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: transparent;
          border: 1px solid #1e293b;
          color: #64748b;
          padding: 0.7rem 1rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          width: 100%;
          transition: 0.2s;
        }
        .logout-btn:hover { color: #ef4444; border-color: #ef4444; }
      `}</style>
    </aside>
  );
}
