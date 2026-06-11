'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus, Trash2, Edit3, Image as ImageIcon, MapPin, Search, X,
  ChevronLeft, ChevronRight, Save, Upload,
  Home as HomeIcon, TrendingUp, MapPinned, DollarSign,
} from 'lucide-react';
import Sidebar from './_components/Sidebar';
import LeadsKanban from './_components/LeadsKanban';
import AgendaTab from './_components/AgendaTab';
import ApprovalsTab from './_components/ApprovalsTab';
import LogsTab from './_components/LogsTab';
import AgentsTab from './_components/AgentsTab';
import BlogTab from './_components/BlogTab';
import BriefingTab from './_components/BriefingTab';
import SkillsTab from './_components/SkillsTab';
import TreinamentoTab from './_components/TreinamentoTab';
import WhatsappTab from './_components/WhatsappTab';
import TerminalTab from './_components/TerminalTab';
import CriativosTab from './_components/CriativosTab';
import VozTab from './_components/VozTab';
import JarvisWidget from './_components/JarvisWidget';

// ===== LOGIN =====
function LocalAdminLogin({ onLogin, error, submitting }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#020617', position: 'fixed', inset: 0, zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', borderRadius: '40px',
        border: '1px solid rgba(234, 179, 8, 0.1)', backgroundColor: '#0f172a',
        padding: '3.5rem', textAlign: 'center', boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.6)', color: '#fff',
      }}>
        <img src="/images/logo-trimmed.png" alt="" style={{ height: '50px', margin: '0 auto 2.5rem', objectFit: 'contain' }} />
        <h2 style={{ marginBottom: '2.5rem', fontSize: '0.65rem', fontWeight: 900, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.3em' }}>
          Acesso Administrativo
        </h2>
        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ fontSize: '10px', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginLeft: '0.8rem', marginBottom: '0.6rem', display: 'block' }}>E-mail</label>
            <input
              type="email" placeholder="seu@email.com"
              style={{ width: '100%', borderRadius: '18px', backgroundColor: '#020617', padding: '1.2rem', color: '#fff', border: '1px solid #1e293b', outline: 'none', fontSize: '14px' }}
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginLeft: '0.8rem', marginBottom: '0.6rem', display: 'block' }}>Senha</label>
            <input
              type="password" placeholder="••••••••"
              style={{ width: '100%', borderRadius: '18px', backgroundColor: '#020617', padding: '1.2rem', color: '#fff', border: '1px solid #1e293b', outline: 'none', fontSize: '14px' }}
              value={pass} onChange={e => setPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onLogin(email, pass)}
            />
          </div>
        </div>
        <button
          onClick={() => onLogin(email, pass)} disabled={submitting}
          style={{ width: '100%', borderRadius: '18px', backgroundColor: submitting ? '#a16207' : '#eab308', padding: '1.4rem', fontWeight: 900, color: '#020617', border: 'none', cursor: submitting ? 'wait' : 'pointer', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.15em', boxShadow: '0 10px 30px rgba(234, 179, 8, 0.2)' }}
        >
          {submitting ? 'Verificando...' : 'Entrar'}
        </button>
        {error && (
          <p style={{ marginTop: '1.5rem', fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>{error}</p>
        )}
        <p style={{ marginTop: '2.5rem', fontSize: '9px', color: '#334155', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          Charles R. Nobre • v7.0
        </p>
      </div>
    </div>
  );
}

// ===== CATÁLOGO =====
const emptyStyle = {
  padding: '4rem',
  textAlign: 'center',
  color: '#475569',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.8rem',
  gridColumn: '1 / -1',
};

function CatalogTab({ properties, onCreate, onEdit, onDelete, onReload, showForm, formData, setFormData, onSubmit, onCancel, externalUrl, setExternalUrl, activeImgIndex, setActiveImgIndex, loading, searchTerm, setSearchTerm, editingId }) {
  const stats = useMemo(() => {
    const total = properties.length;
    const byType = {};
    const byCity = {};
    let priceSum = 0;
    let withPrice = 0;
    properties.forEach((p) => {
      const t = p.type || 'Outro';
      byType[t] = (byType[t] || 0) + 1;
      const c = p.city || 'Outro';
      byCity[c] = (byCity[c] || 0) + 1;
      if (p.price > 0) { priceSum += p.price; withPrice++; }
    });
    const avgPrice = withPrice > 0 ? priceSum / withPrice : 0;
    const topType = Object.entries(byType).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
    const topCity = Object.entries(byCity).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
    return { total, avgPrice, topType, topCity };
  }, [properties]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q) ||
      (p.neighborhood || '').toLowerCase().includes(q)
    );
  }, [properties, searchTerm]);

  const convertGoogleDriveLink = (url) => {
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/(.+?)\/(view|edit)/) || url.match(/id=(.+?)(&|$)/);
      if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
  };

  const handleExternalUrlAdd = (e) => {
    e.preventDefault();
    if (!externalUrl.trim()) return;
    const finalUrl = convertGoogleDriveLink(externalUrl.trim());
    setFormData(prev => ({ ...prev, images: [...prev.images, finalUrl] }));
    setExternalUrl('');
    setActiveImgIndex(formData.images.length);
  };

  const fileInputRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadStatus({ done: 0, total: files.length, errors: [] });

    const formDataBody = new FormData();
    files.forEach((f) => formDataBody.append('files', f));
    formDataBody.append('folder', formData.title || 'imovel');

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formDataBody });
      const json = await res.json();

      if (!res.ok) {
        setUploadStatus({ done: 0, total: files.length, errors: [json.error || 'Erro desconhecido'] });
        return;
      }

      if (Array.isArray(json.uploaded) && json.uploaded.length > 0) {
        const novas = json.uploaded;
        setFormData(prev => ({ ...prev, images: [...prev.images, ...novas] }));
        setActiveImgIndex(formData.images.length);
      }

      setUploadStatus({
        done: json.uploaded?.length || 0,
        total: files.length,
        errors: (json.erros || []).map((er) => `${er.name}: ${er.error}`),
      });
    } catch (err) {
      setUploadStatus({ done: 0, total: files.length, errors: [err.message] });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadStatus(null), 4000);
    }
  };

  return (
    <div className="catalog-wrap">
      <div className="catalog-head">
        <div>
          <h2>Catálogo</h2>
          <p>{stats.total} imóveis</p>
        </div>
        <div className="head-tools">
          <div className="search">
            <Search size={14} />
            <input placeholder="Buscar imóvel..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <button className="btn-new" onClick={onCreate}><Plus size={14} /> Novo</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label"><HomeIcon size={11}/> Total</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label"><TrendingUp size={11}/> Tipo + comum</span>
          <strong>{stats.topType}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label"><MapPinned size={11}/> Cidade + comum</span>
          <strong>{stats.topCity}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label"><DollarSign size={11}/> Preço médio</span>
          <strong>{stats.avgPrice > 0 ? `R$ ${(stats.avgPrice/1000).toFixed(0)}k` : '—'}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {filtered.map((prop) => (
          <div
            key={prop.id}
            onClick={() => onEdit(prop)}
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 12,
              overflow: 'hidden',
              display: 'flex',
              cursor: 'pointer',
              transition: '0.2s',
              minHeight: 130,
            }}
          >
            <div style={{ width: 130, height: 130, flexShrink: 0, background: '#1e293b' }}>
              <img
                src={prop.images?.[0] || '/images/property1.png'}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: '0.9rem', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                {prop.title}
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '4px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12}/> {prop.neighborhood || 'N/A'}, {prop.city || 'N/A'}
              </p>
              <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#eab308' }}>
                  R$ {prop.price?.toLocaleString('pt-BR')}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={(e) => { e.stopPropagation(); onEdit(prop); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: 6, borderRadius: 6, cursor: 'pointer' }}><Edit3 size={13}/></button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(prop.id); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#ef4444', padding: 6, borderRadius: 6, cursor: 'pointer' }}><Trash2 size={13}/></button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && loading && (
          <div style={emptyStyle}><ImageIcon size={32} /> Carregando imóveis...</div>
        )}
        {filtered.length === 0 && !loading && properties.length === 0 && (
          <div style={emptyStyle}>
            <ImageIcon size={32} />
            <strong style={{ color: '#94a3b8' }}>Nenhum imóvel cadastrado.</strong>
            <small style={{ color: '#475569' }}>Clique em "Novo" pra começar, ou verifique a conexão com o Supabase.</small>
            <button onClick={onReload} style={{ marginTop: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem' }}>🔄 Recarregar</button>
          </div>
        )}
        {filtered.length === 0 && !loading && properties.length > 0 && (
          <div style={emptyStyle}><ImageIcon size={32} /> Nenhum imóvel bate com a busca.</div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            data-form-overlay="1"
            onClick={(e) => { if (e.target.getAttribute('data-form-overlay') === '1') onCancel(); }}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(2, 6, 23, 0.80)',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              zIndex: 9000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '2rem', overflowY: 'auto',
            }}
          >
            <motion.div
              className="marketplace-grid-3"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width: '100%', maxWidth: 1280, maxHeight: 'calc(100vh - 4rem)',
                display: 'grid', gridTemplateColumns: '260px 1fr 360px',
                background: '#0a0a12',
                border: '1px solid rgba(234, 179, 8, 0.15)',
                borderRadius: 16,
                boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
                overflow: 'hidden',
              }}
            >
              <div className="col-thumbnails">
                <div className="col-header"><h3>Fotos ({formData.images.length})</h3></div>
                <div className="thumbs-scroll-area">
                  <Reorder.Group values={formData.images} onReorder={(newOrder) => setFormData({...formData, images: newOrder})} className="thumbs-grid">
                    {formData.images.map((img, i) => (
                      <Reorder.Item key={img} value={img} className={`thumb-slot ${activeImgIndex === i ? 'active' : ''}`} onClick={() => setActiveImgIndex(i)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} layout>
                        <div className="drag-handle">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 11V7h2v4H7zm0 6v-4h2v4H7zm6-6V7h2v4h-2zm0 6v-4h2v4h-2zm6-6V7h2v4h-2zm0 6v-4h2v4h-2z"/></svg>
                        </div>
                        <img src={img} alt="" />
                        <button className="btn-remove-photo" onClick={(e) => { e.stopPropagation(); setFormData({...formData, images: formData.images.filter((_, idx) => idx !== i)}); }}>
                          <X size={12}/>
                        </button>
                        {i === 0 && <span className="capa-label">CAPA</span>}
                      </Reorder.Item>
                    ))}
                    <div className="thumb-slot empty"><ImageIcon size={20} className="text-slate-800" /></div>
                  </Reorder.Group>
                </div>
                <div className="add-url-section">
                  <p className="hint">Subir fotos do computador:</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn-upload-file"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadStatus && uploadStatus.done < uploadStatus.total}
                  >
                    <Upload size={16}/>
                    {uploadStatus
                      ? `Subindo ${uploadStatus.done}/${uploadStatus.total}...`
                      : 'Escolher arquivos'}
                  </button>
                  {uploadStatus?.errors?.length > 0 && (
                    <div className="upload-errors">
                      {uploadStatus.errors.map((er, i) => <div key={i}>{er}</div>)}
                    </div>
                  )}

                  <p className="hint" style={{ marginTop: '1rem' }}>Ou cole link do Google Drive:</p>
                  <form onSubmit={handleExternalUrlAdd} className="url-form">
                    <input type="text" placeholder="https://drive.google.com/..." value={externalUrl} onChange={e => setExternalUrl(e.target.value)} />
                    <button type="submit"><Plus size={18}/></button>
                  </form>
                </div>
              </div>

              <div className="col-preview">
                <div className="preview-stage">
                  <button className="btn-close-market" onClick={onCancel}><X size={24}/></button>
                  <AnimatePresence mode="wait">
                    <motion.img key={activeImgIndex} src={formData.images[activeImgIndex] || '/images/property1.png'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="main-preview-img" />
                  </AnimatePresence>
                  {formData.images.length > 1 && (
                    <div className="nav-btns">
                      <button onClick={() => setActiveImgIndex(prev => (prev > 0 ? prev - 1 : formData.images.length - 1))}><ChevronLeft/></button>
                      <button onClick={() => setActiveImgIndex(prev => (prev < formData.images.length - 1 ? prev + 1 : 0))}><ChevronRight/></button>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-form-details">
                <div className="col-header"><h3>{editingId ? 'Editar Anúncio' : 'Novo Anúncio'}</h3></div>
                <form onSubmit={onSubmit} className="details-form">
                  <div className="field">
                    <label>Título</label>
                    <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Apto 118m² 3 Quartos" />
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Preço (R$)</label>
                      <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0.00" />
                    </div>
                    <div className="field">
                      <label>Categoria</label>
                      <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option>Residencial</option>
                        <option>Alto Padrão</option>
                        <option>Litorâneo</option>
                        <option>Comercial/Residencial</option>
                        <option>Terreno</option>
                      </select>
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Tipo</label>
                      <select value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})}>
                        <option value="">—</option>
                        <option>Apartamento</option>
                        <option>Casa</option>
                        <option>Prédio</option>
                        <option>Terreno</option>
                        <option>Cobertura</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Intenção</label>
                      <select value={formData.intent || 'venda'} onChange={e => setFormData({...formData, intent: e.target.value})}>
                        <option value="venda">Venda</option>
                        <option value="aluguel">Aluguel</option>
                      </select>
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Cidade</label>
                      <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                    </div>
                    <div className="field">
                      <label>Bairro</label>
                      <input type="text" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Link do Vídeo Tour</label>
                    <input type="text" value={formData.video} onChange={e => setFormData({...formData, video: e.target.value})} placeholder="Ex: /images/imob-138/garden-tour.mp4" />
                  </div>
                  <div className="field">
                    <label>Descrição</label>
                    <textarea rows="6" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>
                  <button type="submit" className="btn-save" disabled={loading}>
                    <Save size={18}/> {loading ? 'Sincronizando...' : 'Publicar'}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .catalog-wrap { padding: 2rem; }
        .catalog-head { display: flex; justify-content: space-between; align-items: end; margin-bottom: 1.5rem; }
        .catalog-head h2 { font-size: 1.8rem; font-weight: 900; color: #f8fafc; letter-spacing: -1px; }
        .catalog-head p { color: #64748b; font-size: 0.85rem; margin-top: 0.3rem; }
        .head-tools { display: flex; gap: 0.6rem; align-items: center; }
        .search { display: flex; align-items: center; gap: 0.5rem; background: #0f172a; border: 1px solid #1e293b; padding: 0.5rem 0.9rem; border-radius: 8px; color: #64748b; }
        .search input { background: transparent; border: none; outline: none; color: #f8fafc; font-size: 0.85rem; width: 220px; }
        .btn-new {
          background: #eab308; color: #020617; border: none;
          padding: 0.55rem 1rem; border-radius: 8px; font-weight: 900;
          font-size: 0.8rem; display: flex; align-items: center; gap: 0.4rem; cursor: pointer;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .btn-new:hover { background: #facc15; }

        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.8rem; margin-bottom: 1.5rem; }
        .stat-card { background: #070b14; border: 1px solid #1e293b; padding: 1rem; border-radius: 10px; }
        .stat-label { font-size: 0.65rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800; display: flex; align-items: center; gap: 0.3rem; }
        .stat-card strong { display: block; margin-top: 0.4rem; font-size: 1.3rem; color: #eab308; font-weight: 900; }
        @media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }

        .ads-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
        .ad-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; display: flex; cursor: pointer; transition: 0.2s; }
        .ad-card:hover { border-color: #eab308; transform: translateY(-2px); }
        .ad-thumb { width: 130px; height: 130px; flex-shrink: 0; background: #1e293b; }
        .ad-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .ad-info { padding: 0.9rem; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }
        .ad-info h3 { font-size: 0.9rem; font-weight: 800; color: #f8fafc; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ad-info p { font-size: 0.72rem; color: #64748b; margin: 4px 0; display: flex; align-items: center; gap: 4px; }
        .ad-foot { display: flex; align-items: end; justify-content: space-between; }
        .price { font-size: 1.05rem; font-weight: 900; color: #eab308; }
        .actions { display: flex; gap: 4px; }
        .btn-icon { background: rgba(255,255,255,0.05); border: none; color: #fff; padding: 6px; border-radius: 6px; cursor: pointer; }
        .btn-icon.danger:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .empty-grid { padding: 4rem; text-align: center; color: #475569; display: flex; flex-direction: column; align-items: center; gap: 0.8rem; grid-column: 1 / -1; }

        /* Overlay escuro translúcido cobrindo TUDO (inclui sidebar) */
        .form-overlay {
          position: fixed; inset: 0;
          background: rgba(2, 6, 23, 0.78);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          z-index: 5000;
          display: flex; align-items: center; justify-content: center;
          padding: 2rem;
          overflow-y: auto;
        }
        /* Modal centralizado responsivo */
        .marketplace-grid-3 {
          width: 100%; max-width: 1400px; max-height: calc(100vh - 4rem);
          display: grid; grid-template-columns: 260px 1fr 360px;
          background: #0a0a12;
          border: 1px solid rgba(234, 179, 8, 0.15);
          border-radius: 16px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.7);
          overflow: hidden;
        }
        /* Tablet: foto vira menor, mantém 3 colunas */
        @media (max-width: 1200px) {
          .marketplace-grid-3 { grid-template-columns: 220px 1fr 320px; }
        }
        /* Mobile / tela menor: vira coluna única com scroll */
        @media (max-width: 900px) {
          .form-overlay { padding: 0; }
          .marketplace-grid-3 {
            grid-template-columns: 1fr;
            max-width: 100%;
            max-height: 100vh;
            border-radius: 0;
            height: 100%;
            overflow-y: auto;
          }
        }
        .col-thumbnails { border-right: 1px solid #1e293b; background: #070b14; padding: 1.5rem; display: flex; flex-direction: column; overflow: hidden; }
        .thumbs-scroll-area { flex-grow: 1; overflow-y: auto; padding-right: 0.5rem; margin-bottom: 1.5rem; }
        .col-header h3 { font-size: 0.8rem; font-weight: 900; color: #eab308; text-transform: uppercase; margin-bottom: 1.5rem; letter-spacing: 0.15em; }
        .thumbs-grid { display: flex; flex-direction: column; gap: 0.8rem; width: 100%; list-style: none; padding: 0; margin: 0; }
        .thumb-slot { width: 100%; height: 100px; background: #0f172a; border: 2px solid #1e293b; border-radius: 12px; position: relative; overflow: hidden; cursor: pointer; display: flex; align-items: center; justify-content: start; transition: 0.2s; padding: 0.6rem; gap: 1rem; box-sizing: border-box; list-style: none; }
        .thumb-slot.active { border-color: #eab308; box-shadow: 0 0 20px rgba(234, 179, 8, 0.2); }
        .thumb-slot img { width: 80px; height: 100%; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
        .drag-handle { background: rgba(255,255,255,0.05); color: #64748b; padding: 0.8rem; border-radius: 8px; cursor: grab; transition: 0.2s; }
        .thumb-slot:hover .drag-handle { color: #eab308; background: rgba(234, 179, 8, 0.1); }
        .btn-remove-photo { position: absolute; top: 0.5rem; right: 0.5rem; background: #ef4444; color: #fff; border: none; padding: 6px; border-radius: 6px; z-index: 10; opacity: 0.3; transition: 0.2s; cursor: pointer; }
        .thumb-slot:hover .btn-remove-photo { opacity: 1; }
        .capa-label { background: #eab308; color: #020617; font-size: 8px; font-weight: 900; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; position: absolute; bottom: 6px; right: 6px; }
        .add-url-section { padding-top: 1rem; border-top: 1px solid #1e293b; }
        .hint { font-size: 0.7rem; color: #64748b; margin-bottom: 0.6rem; font-weight: 800; }
        .url-form { display: flex; gap: 4px; }
        .url-form input { background: #0f172a; border: 1px solid #1e293b; padding: 0.7rem; border-radius: 8px; color: #fff; font-size: 0.8rem; flex-grow: 1; }
        .url-form button { background: #eab308; color: #020617; padding: 0.7rem; border-radius: 8px; border: none; cursor: pointer; }
        .btn-upload-file {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          background: #eab308; color: #020617; padding: 0.8rem; border-radius: 8px; border: none;
          cursor: pointer; font-weight: 900; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;
          transition: 0.2s;
        }
        .btn-upload-file:hover:not(:disabled) { background: #facc15; }
        .btn-upload-file:disabled { background: #1e293b; color: #64748b; cursor: wait; }
        .upload-errors { margin-top: 0.6rem; font-size: 0.7rem; color: #ef4444; line-height: 1.4; }

        .col-preview { background: #020617; display: flex; align-items: center; justify-content: center; padding: 3rem; position: relative; }
        .preview-stage { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; }
        .main-preview-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 16px; box-shadow: 0 40px 100px rgba(0,0,0,0.5); }
        .btn-close-market { position: absolute; top: 0; right: 0; background: #1e293b; color: #fff; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 100; cursor: pointer; }
        .btn-close-market:hover { background: #ef4444; }
        .nav-btns { position: absolute; width: 100%; display: flex; justify-content: space-between; padding: 0 1rem; pointer-events: none; }
        .nav-btns button { pointer-events: auto; background: rgba(15, 23, 42, 0.7); border: 1px solid #1e293b; color: #fff; width: 44px; height: 44px; border-radius: 50%; opacity: 0.6; cursor: pointer; }
        .nav-btns button:hover { opacity: 1; border-color: #eab308; }

        .col-form-details { background: #070b14; border-left: 1px solid #1e293b; padding: 2rem; overflow-y: auto; padding-bottom: 200px; }
        .details-form { display: flex; flex-direction: column; gap: 1.2rem; }
        .field label { display: block; font-size: 0.7rem; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.1em; }
        .field input, .field select, .field textarea { width: 100%; background: #0f172a; border: 1px solid #1e293b; padding: 0.85rem; border-radius: 8px; color: #fff; font-size: 0.85rem; box-sizing: border-box; font-family: inherit; }
        .field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: #eab308; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
        .btn-save { background: #eab308; color: #020617; padding: 1rem; border-radius: 10px; font-weight: 900; text-transform: uppercase; border: none; display: flex; align-items: center; justify-content: center; gap: 0.8rem; margin-top: 1rem; cursor: pointer; letter-spacing: 0.1em; }
        .btn-save:disabled { opacity: 0.5; }
      `}</style>
    </div>
  );
}

// ===== CONFIGURAÇÕES =====
function SettingsTab({ siteConfigs, setSiteConfigs, onSave }) {
  return (
    <div className="settings-wrap">
      <div className="settings-head">
        <h2>Configurações</h2>
        <p>Conteúdo institucional do site público</p>
      </div>

      <div className="glass-panel">
        <h3>Contato</h3>
        <div className="field-row">
          <div className="field">
            <label>E-mail</label>
            <input type="email" value={siteConfigs.contact_email || ''} onChange={e => setSiteConfigs({...siteConfigs, contact_email: e.target.value})} placeholder="exemplo@email.com" />
          </div>
          <div className="field">
            <label>WhatsApp</label>
            <input type="text" value={siteConfigs.contact_phone || ''} onChange={e => setSiteConfigs({...siteConfigs, contact_phone: e.target.value})} placeholder="(48) 99999-9999" />
          </div>
        </div>
        <div className="field">
          <label>Título do Hero</label>
          <input type="text" value={siteConfigs.hero_title || ''} onChange={e => setSiteConfigs({...siteConfigs, hero_title: e.target.value})} />
        </div>

        <h3 style={{ marginTop: '2rem' }}>Biografia</h3>
        <textarea
          value={siteConfigs.about_bio || ''}
          onChange={e => setSiteConfigs({...siteConfigs, about_bio: e.target.value})}
          placeholder="Texto que aparece na seção Sobre..."
        />

        <button onClick={() => onSave(siteConfigs)} className="btn-save">
          <Save size={16}/> Salvar
        </button>
      </div>

      <style jsx>{`
        .settings-wrap { padding: 2rem; max-width: 900px; }
        .settings-head { margin-bottom: 1.5rem; }
        .settings-head h2 { font-size: 1.8rem; font-weight: 900; color: #f8fafc; letter-spacing: -1px; }
        .settings-head p { color: #64748b; font-size: 0.85rem; margin-top: 0.3rem; }

        .glass-panel { background: #070b14; border: 1px solid #1e293b; border-radius: 14px; padding: 2rem; }
        .glass-panel h3 { font-size: 0.75rem; text-transform: uppercase; color: #eab308; letter-spacing: 0.2em; font-weight: 900; margin-bottom: 1rem; }

        .field { margin-bottom: 1.2rem; }
        .field label { display: block; font-size: 0.7rem; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.1em; }
        .field input { width: 100%; background: #0f172a; border: 1px solid #1e293b; padding: 0.85rem; border-radius: 8px; color: #fff; font-size: 0.85rem; box-sizing: border-box; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        textarea { width: 100%; background: #0f172a; border: 1px solid #1e293b; padding: 1rem; border-radius: 8px; color: #fff; font-size: 0.9rem; min-height: 220px; box-sizing: border-box; font-family: inherit; }
        .btn-save { background: #eab308; color: #020617; padding: 0.9rem 1.5rem; border-radius: 10px; font-weight: 900; text-transform: uppercase; border: none; display: inline-flex; align-items: center; gap: 0.5rem; margin-top: 1.5rem; cursor: pointer; letter-spacing: 0.1em; font-size: 0.8rem; }
      `}</style>
    </div>
  );
}

// ===== ADMIN PAGE =====
export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('catalog');
  const [properties, setProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [siteConfigs, setSiteConfigs] = useState({ about_bio: '', contact_email: '', contact_phone: '', hero_title: '' });
  const [formData, setFormData] = useState({ title: '', description: '', price: '', city: 'Imbituba', neighborhood: '', state: 'SC', category: 'Residencial', type: '', intent: 'venda', images: [], video: '' });
  const [leadsCount, setLeadsCount] = useState(0);
  const [approvalsCount, setApprovalsCount] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch('/api/admin/status', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { if (alive) setIsLoggedIn(Boolean(data?.authenticated)); })
      .catch(() => {})
      .finally(() => { if (alive) setInitialized(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchProperties();
    fetchSiteConfigs();
    fetchLeadsCount();
    fetchApprovalsCount();
  }, [isLoggedIn]);

  async function fetchProperties() {
    try {
      setLoadingProps(true);
      const res = await fetch('/api/properties', { cache: 'no-store' });
      if (!res.ok) {
        console.error('properties: HTTP', res.status);
        setProperties([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        console.log(`[admin] /api/properties → ${data.length} imóveis`);
        setProperties(data);
      } else {
        console.error('properties: response não é array', data);
        setProperties([]);
      }
    } catch (err) {
      console.error('properties: fetch falhou', err);
      setProperties([]);
    } finally {
      setLoadingProps(false);
    }
  }

  async function fetchSiteConfigs() {
    try {
      const res = await fetch('/api/configs');
      const data = await res.json();
      setSiteConfigs(data || {});
    } catch (err) { console.error('configs:', err); }
  }

  async function fetchLeadsCount() {
    try {
      const res = await fetch('/api/leads', { credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data)) setLeadsCount(data.filter((l) => l.status === 'novo').length);
    } catch (err) { /* ignora */ }
  }

  async function fetchApprovalsCount() {
    try {
      const res = await fetch('/api/approvals?status=pending', { credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data)) setApprovalsCount(data.length);
    } catch (err) { /* ignora */ }
  }

  const handleAttemptLogin = async (email, pass) => {
    setLoginError('');
    setLoginSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ email, pass }),
      });
      if (res.ok) setIsLoggedIn(true);
      else {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || 'Credenciais inválidas.');
      }
    } catch (err) { setLoginError('Erro de rede.'); }
    finally { setLoginSubmitting(false); }
  };

  const handleLogout = async () => {
    try { await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }); } catch {}
    setIsLoggedIn(false);
    window.location.href = '/admin';
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', price: '', city: 'Imbituba', neighborhood: '', state: 'SC', category: 'Residencial', type: '', intent: 'venda', images: [], video: '' });
    setShowForm(true);
    setActiveImgIndex(0);
  };

  const handleEdit = (prop) => {
    if (!prop || !prop.id) {
      console.warn('[admin] handleEdit chamado sem prop valido', prop);
      return;
    }
    setEditingId(prop.id);
    // Normaliza imagens (Rokni original podia vir como [{large,medium}], mas o
    // toCanonical ja deveria flatten; deixamos defensivo de qualquer jeito).
    const imgs = Array.isArray(prop.images)
      ? prop.images.map((i) => (typeof i === 'string' ? i : (i?.large || i?.medium || ''))).filter(Boolean)
      : [];
    setFormData({
      ...prop,
      title: prop.title || '',
      description: prop.description || '',
      price: String(prop.price ?? ''),
      city: prop.city || 'Imbituba',
      neighborhood: prop.neighborhood || '',
      state: prop.state || 'SC',
      category: prop.category || 'Residencial',
      type: prop.type || '',
      intent: prop.intent || 'venda',
      images: imgs,
      video: prop.video || '',
    });
    setShowForm(true);
    setActiveImgIndex(0);
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este imóvel? Não dá pra desfazer.')) return;
    try {
      const res = await fetch(`/api/properties?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) setProperties((prev) => prev.filter(p => p.id !== id));
      else { const err = await res.json().catch(() => ({})); alert('Falha: ' + (err.error || res.status)); }
    } catch (err) { alert('Falha ao excluir.'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingProps(true);
    try {
      const dataToSave = {
        ...formData,
        price: Number(formData.price),
        state: formData.state || 'SC',
      };
      let row;
      let updated;
      if (editingId) {
        row = { ...properties.find(p => p.id === editingId), ...dataToSave, id: editingId };
        updated = properties.map(p => p.id === editingId ? row : p);
      } else {
        row = { ...dataToSave, id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) };
        updated = [row, ...properties];
      }
      const res = await fetch('/api/properties', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(row),
      });
      if (res.ok) {
        setProperties(updated);
        setShowForm(false);
        setEditingId(null);
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Falha ao salvar: ' + (err.error || res.status));
      }
    } catch (err) { alert('Falha ao salvar.'); }
    finally { setLoadingProps(false); }
  };

  const handleSaveConfigs = async (newConfigs) => {
    try {
      const res = await fetch('/api/configs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(newConfigs),
      });
      if (res.ok) { setSiteConfigs(newConfigs); alert('Configurações salvas.'); }
      else { const err = await res.json().catch(() => ({})); alert('Falha: ' + (err.error || res.status)); }
    } catch (err) { alert('Falha ao salvar.'); }
  };

  if (!initialized) return null;
  if (!isLoggedIn) return <LocalAdminLogin onLogin={handleAttemptLogin} error={loginError} submitting={loginSubmitting} />;

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: `
        html, body { background: #020617 !important; margin: 0 !important; padding: 0 !important; }
        .admin-shell { display: flex; min-height: 100vh; background: #020617; font-family: 'Inter', system-ui, sans-serif; color: #f8fafc; }
        .admin-main { flex-grow: 1; min-height: 100vh; overflow-y: auto; }
      ` }} />

      <Sidebar
        activeTab={activeTab}
        onChange={setActiveTab}
        onLogout={handleLogout}
        leadsCount={leadsCount}
        approvalsCount={approvalsCount}
      />

      <main className="admin-main">
        {activeTab === 'catalog' && (
          <CatalogTab
            properties={properties}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReload={fetchProperties}
            showForm={showForm}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingId(null); }}
            externalUrl={externalUrl}
            setExternalUrl={setExternalUrl}
            activeImgIndex={activeImgIndex}
            setActiveImgIndex={setActiveImgIndex}
            loading={loadingProps}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            editingId={editingId}
          />
        )}
        {activeTab === 'leads' && <LeadsKanban />}
        {activeTab === 'blog' && <BlogTab />}
        {activeTab === 'agenda' && <AgendaTab />}
        {activeTab === 'approvals' && <ApprovalsTab />}
        {activeTab === 'agents' && <AgentsTab />}
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'briefing' && <BriefingTab />}
        {activeTab === 'skills' && <SkillsTab />}
        {activeTab === 'treinamento' && <TreinamentoTab />}
        {activeTab === 'whatsapp' && <WhatsappTab />}
        {activeTab === 'terminal' && <TerminalTab />}
        {activeTab === 'criativos' && <CriativosTab />}
        {activeTab === 'voz' && <VozTab />}
        {activeTab === 'settings' && (
          <SettingsTab
            siteConfigs={siteConfigs}
            setSiteConfigs={setSiteConfigs}
            onSave={handleSaveConfigs}
          />
        )}
      </main>

      {/* Bolinha do Jarvis no canto inferior direito — visível em todas as abas */}
      <JarvisWidget />
    </div>
  );
}
