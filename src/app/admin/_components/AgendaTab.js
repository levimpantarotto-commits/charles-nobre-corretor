'use client';
import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Check, RefreshCw } from 'lucide-react';

const TYPE_META = {
  reuniao: { label: 'Reunião', color: '#3b82f6' },
  ligacao: { label: 'Ligação', color: '#22c55e' },
  vistoria: { label: 'Vistoria', color: '#eab308' },
  tarefa: { label: 'Tarefa', color: '#a855f7' },
  outro: { label: 'Outro', color: '#64748b' },
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function fmtDateISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function NewEventModal({ initialDate, onCancel, onSave }) {
  const [form, setForm] = useState({
    title: '', description: '', event_date: initialDate, event_time: '',
    event_type: 'reuniao',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave({ ...form, event_time: form.event_time || null });
    setSaving(false);
  };

  return (
    <div className="modal-back" onClick={onCancel}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h3>Novo Evento</h3>
          <button type="button" className="close" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="field">
          <label>Título</label>
          <input required placeholder="Ex: Reunião com cliente João" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Data</label>
            <input type="date" required value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
          </div>
          <div className="field">
            <label>Hora</label>
            <input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Tipo</label>
          <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
            {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Notas</label>
          <textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button type="submit" className="save" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Evento'}
        </button>

        <style jsx>{`
          .modal-back { position: fixed; inset: 0; background: rgba(2,6,23,0.85); backdrop-filter: blur(8px); z-index: 3000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
          .modal-card { background: #070b14; border: 1px solid #1e293b; border-radius: 14px; padding: 1.8rem; width: 100%; max-width: 480px; }
          .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
          .modal-head h3 { color: #f8fafc; font-size: 1.2rem; font-weight: 900; }
          .close { background: transparent; border: none; color: #64748b; cursor: pointer; }
          .field { margin-bottom: 1rem; }
          .field label { display: block; font-size: 0.7rem; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 0.4rem; letter-spacing: 0.1em; }
          .field input, .field select, .field textarea {
            width: 100%; background: #0f172a; border: 1px solid #1e293b;
            padding: 0.75rem; border-radius: 8px; color: #fff; font-size: 0.85rem;
            box-sizing: border-box; font-family: inherit;
          }
          .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
          .save { width: 100%; background: #eab308; color: #020617; padding: 0.9rem; border-radius: 10px; font-weight: 900; text-transform: uppercase; border: none; cursor: pointer; letter-spacing: 0.1em; font-size: 0.8rem; margin-top: 0.5rem; }
          .save:disabled { opacity: 0.5; }
        `}</style>
      </form>
    </div>
  );
}

export default function AgendaTab() {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingFor, setCreatingFor] = useState(null);

  const monthBounds = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const last = new Date(view.year, view.month + 1, 0);
    return { from: fmtDateISO(first), to: fmtDateISO(last), firstDow: first.getDay(), lastDay: last.getDate() };
  }, [view]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?from=${monthBounds.from}&to=${monthBounds.to}`, { credentials: 'include' });
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [view]);

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      if (!map[e.event_date]) map[e.event_date] = [];
      map[e.event_date].push(e);
    });
    return map;
  }, [events]);

  const gridCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < monthBounds.firstDow; i++) cells.push(null);
    for (let d = 1; d <= monthBounds.lastDay; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthBounds]);

  const handlePrev = () => {
    const m = view.month - 1;
    if (m < 0) setView({ year: view.year - 1, month: 11 });
    else setView({ ...view, month: m });
  };
  const handleNext = () => {
    const m = view.month + 1;
    if (m > 11) setView({ year: view.year + 1, month: 0 });
    else setView({ ...view, month: m });
  };

  const saveEvent = async (form) => {
    const res = await fetch('/api/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setCreatingFor(null);
      refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      alert('Falha: ' + (err.error || res.status));
    }
  };

  const toggleDone = async (ev) => {
    const optimistic = events.map((e) => e.id === ev.id ? { ...e, done: !e.done } : e);
    setEvents(optimistic);
    await fetch(`/api/events/${ev.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ done: !ev.done }),
    });
  };

  const deleteEvent = async (id) => {
    if (!confirm('Excluir evento?')) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/events/${id}`, { method: 'DELETE', credentials: 'include' });
  };

  const todayISO = fmtDateISO(today);

  return (
    <div className="agenda-wrap">
      <div className="agenda-head">
        <div>
          <h2>Agenda</h2>
          <p>{events.length} evento{events.length === 1 ? '' : 's'} este mês</p>
        </div>
        <div className="head-tools">
          <button className="nav-btn" onClick={handlePrev}><ChevronLeft size={14} /></button>
          <span className="month-label">{MONTHS[view.month]} {view.year}</span>
          <button className="nav-btn" onClick={handleNext}><ChevronRight size={14} /></button>
          <button className="refresh" onClick={refresh} title="Atualizar"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="weekdays">
        {WEEKDAYS.map((w) => <div key={w} className="weekday">{w}</div>)}
      </div>

      <div className="grid">
        {gridCells.map((d, i) => {
          if (d === null) return <div key={i} className="cell empty" />;
          const iso = fmtDateISO(new Date(view.year, view.month, d));
          const evs = eventsByDate[iso] || [];
          const isToday = iso === todayISO;
          return (
            <div key={i} className={`cell ${isToday ? 'today' : ''}`}>
              <div className="cell-head">
                <span className="day-num">{d}</span>
                <button className="cell-add" onClick={() => setCreatingFor(iso)} title="Adicionar"><Plus size={11} /></button>
              </div>
              <div className="cell-events">
                {evs.slice(0, 3).map((e) => (
                  <div key={e.id} className={`event ${e.done ? 'done' : ''}`} style={{ borderLeftColor: TYPE_META[e.event_type]?.color || '#64748b' }}>
                    <span className="ev-time">{e.event_time?.slice(0, 5) || ''}</span>
                    <span className="ev-title">{e.title}</span>
                    <div className="ev-actions">
                      <button onClick={() => toggleDone(e)} title={e.done ? 'Desfazer' : 'Concluir'}><Check size={10} /></button>
                      <button onClick={() => deleteEvent(e.id)} title="Excluir"><X size={10} /></button>
                    </div>
                  </div>
                ))}
                {evs.length > 3 && <div className="more">+ {evs.length - 3} mais</div>}
              </div>
            </div>
          );
        })}
      </div>

      {creatingFor && (
        <NewEventModal initialDate={creatingFor} onCancel={() => setCreatingFor(null)} onSave={saveEvent} />
      )}

      <style jsx>{`
        .agenda-wrap { padding: 2rem; }
        .agenda-head { display: flex; justify-content: space-between; align-items: end; margin-bottom: 1.2rem; }
        .agenda-head h2 { font-size: 1.8rem; font-weight: 900; color: #f8fafc; letter-spacing: -1px; }
        .agenda-head p { color: #64748b; font-size: 0.85rem; margin-top: 0.3rem; }
        .head-tools { display: flex; gap: 0.5rem; align-items: center; }
        .nav-btn, .refresh { background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 0.55rem; border-radius: 8px; cursor: pointer; }
        .nav-btn:hover, .refresh:hover { color: #eab308; border-color: #eab308; }
        .month-label { color: #f8fafc; font-weight: 900; padding: 0 1rem; font-size: 0.95rem; min-width: 160px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; }

        .weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; }
        .weekday { text-align: center; font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800; padding: 0.5rem 0; }

        .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .cell {
          background: #070b14; border: 1px solid #1e293b; border-radius: 8px;
          padding: 0.5rem; min-height: 110px; display: flex; flex-direction: column;
        }
        .cell.empty { background: transparent; border-color: transparent; }
        .cell.today { border-color: #eab308; box-shadow: 0 0 20px rgba(234,179,8,0.15); }
        .cell-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem; }
        .day-num { color: #94a3b8; font-weight: 800; font-size: 0.8rem; }
        .cell.today .day-num { color: #eab308; }
        .cell-add { background: transparent; border: 1px solid #1e293b; color: #475569; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border-radius: 4px; cursor: pointer; }
        .cell-add:hover { color: #eab308; border-color: #eab308; }

        .cell-events { display: flex; flex-direction: column; gap: 3px; }
        .event {
          background: #0f172a; border-left: 3px solid #64748b;
          padding: 3px 5px; border-radius: 3px;
          font-size: 0.65rem; color: #cbd5e1;
          display: flex; align-items: center; gap: 4px;
          position: relative;
        }
        .event.done { opacity: 0.4; text-decoration: line-through; }
        .ev-time { color: #eab308; font-weight: 800; flex-shrink: 0; font-size: 0.6rem; }
        .ev-title { flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ev-actions { display: none; gap: 2px; }
        .event:hover .ev-actions { display: flex; }
        .ev-actions button { background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 1px; }
        .ev-actions button:hover { color: #eab308; }
        .more { color: #64748b; font-size: 0.6rem; padding-left: 5px; }
      `}</style>
    </div>
  );
}
