'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  FileText, Settings, LogOut, Plus, Trash2, Edit3, 
  Image as ImageIcon, MapPin, Search, X, Maximize2, 
  ChevronLeft, ChevronRight, Link as LinkIcon, Save, Info
} from 'lucide-react';
import Footer from '@/components/Footer';

// Componente de Login Simples e Profissional
function LocalAdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#020617',
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        borderRadius: '40px',
        border: '1px solid rgba(234, 179, 8, 0.1)',
        backgroundColor: '#0f172a',
        padding: '3.5rem',
        textAlign: 'center',
        boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.6)',
        color: '#fff'
      }}>
        <img src="/images/logo-trimmed.png" alt="" style={{ height: '50px', margin: '0 auto 2.5rem', objectFit: 'contain' }} />
        <h2 style={{ marginBottom: '2.5rem', fontSize: '0.65rem', fontWeight: 900, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.3em' }}>
          Acesso Administrativo
        </h2>
        
        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ fontSize: '10px', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginLeft: '0.8rem', marginBottom: '0.6rem', display: 'block' }}>E-mail Administrativo</label>
            <input 
              type="email" 
              placeholder="seu@email.com"
              style={{ width: '100%', borderRadius: '18px', backgroundColor: '#020617', padding: '1.2rem', color: '#fff', border: '1px solid #1e293b', outline: 'none', fontSize: '14px' }} 
              value={email} 
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginLeft: '0.8rem', marginBottom: '0.6rem', display: 'block' }}>Senha de Acesso</label>
            <input 
              type="password" 
              placeholder="••••••••"
              style={{ width: '100%', borderRadius: '18px', backgroundColor: '#020617', padding: '1.2rem', color: '#fff', border: '1px solid #1e293b', outline: 'none', fontSize: '14px' }} 
              value={pass} 
              onChange={e => setPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onLogin(email, pass)}
            />
          </div>
        </div>

        <button 
          onClick={() => onLogin(email, pass)}
          style={{ width: '100%', borderRadius: '18px', backgroundColor: '#eab308', padding: '1.4rem', fontWeight: 900, color: '#020617', border: 'none', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.15em', boxShadow: '0 10px 30px rgba(234, 179, 8, 0.2)' }}
        >
          Entrar no Painel
        </button>
        <p style={{ marginTop: '2.5rem', fontSize: '9px', color: '#334155', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          Autenticação Segura • v5.4
        </p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('properties');
  const [showForm, setShowForm] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Inicialização e Persistência do Login
  useEffect(() => {
    const auth = localStorage.getItem('charles_admin_auth');
    if (auth === 'true') setIsLoggedIn(true);
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      document.body.style.overflow = 'hidden';
      
      const cleanup = () => {
        const selectors = ['.navbar', 'header', 'footer', '.hero-section', '.search-bar', '#nav'];
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el.remove());
        });
      };
      
      cleanup();
      setTimeout(cleanup, 500);
      setTimeout(cleanup, 2000);

      fetchProperties();
      fetchSiteConfigs();
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem('charles_admin_auth');
    setIsLoggedIn(false);
    window.location.reload();
  };
  
  const [siteConfigs, setSiteConfigs] = useState({ about_bio: '', contact_email: '', contact_phone: '' });
  const [formData, setFormData] = useState({ title: '', description: '', price: '', city: 'Imbituba', neighborhood: '', category: 'Residencial', images: [] });

  const handleAttemptLogin = (email, pass) => {
    if (email === 'levimpantarotto@gmail.com' && pass === 'Master17453166') {
      localStorage.setItem('charles_admin_auth', 'true');
      setIsLoggedIn(true);
    } else {
      alert('Credenciais incorretas para este painel local.');
    }
  };

  async function fetchProperties() {
    try {
      setLoading(true);
      const res = await fetch('/api/properties');
      const data = await res.json();
      setProperties(data || []);
    } catch (err) { console.error('Error fetching properties'); }
    finally { setLoading(false); }
  }

  async function fetchSiteConfigs() {
    try {
      const res = await fetch('/api/configs');
      const data = await res.json();
      setSiteConfigs(data);
    } catch (err) { console.error('Error fetching configs'); }
  }

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

  const handleEdit = (prop) => {
    setEditingId(prop.id);
    setFormData({ ...prop, price: prop.price.toString() });
    setShowForm(true);
    setActiveImgIndex(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let updated;
      if (editingId) {
        updated = properties.map(p => p.id === editingId ? { ...formData, id: editingId } : p);
      } else {
        const newProperty = { ...formData, id: Date.now() };
        updated = [newProperty, ...properties];
      }

      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        setProperties(updated);
        setShowForm(false);
        setEditingId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (newConfigs) => {
    try {
      const res = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfigs),
      });
      if (res.ok) {
        setSiteConfigs(newConfigs);
        alert('Configurações atualizadas com sucesso.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!initialized) return null;
  if (!isLoggedIn) return <LocalAdminLogin onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="admin-marketplace-layout">
      {/* INJEÇÃO DE CSS GLOBAL PARA SOBREPOSIÇÃO SOBERANA E ROLAGEM */}
      <style dangerouslySetInnerHTML={{ __html: `
        .navbar, header, footer, .hero-section, .navbar.scrolled, .search-bar, #nav { display: none !important; opacity: 0 !important; pointer-events: none !important; }
        html, body { background: #020617 !important; overflow: hidden !important; width: 100vw; height: 100vh; margin: 0; padding: 0; }
        
        .admin-marketplace-layout { 
          position: fixed !important; 
          inset: 0 !important; 
          z-index: 9999999 !important; 
          background: #020617 !important; 
          width: 100vw !important;
          height: 100vh !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important; 
          font-family: 'Inter', sans-serif;
        }
        
        .admin-main-container { 
          flex-grow: 1 !important; 
          overflow-y: auto !important; 
          background: #020617 !important;
          -webkit-overflow-scrolling: touch;
        }

        .layout-split {
          min-height: 100%;
          display: flex;
          flex-direction: column;
        }
      ` }} />

      {/* HEADER SUPERIOR FINO */}
      <nav className="admin-top-nav">
        <div className="flex items-center gap-6">
          <img src="/images/logo-trimmed.png" alt="" className="h-8" />
          <div className="h-4 w-[1px] bg-slate-800"></div>
          <button onClick={() => setActiveTab('properties')} className={`nav-link ${activeTab === 'properties' ? 'active' : ''}`}>Meus Anúncios</button>
          <button onClick={() => setActiveTab('settings')} className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}>Biografia</button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => { setEditingId(null); setFormData({title:'', description:'', price:'', city:'Imbituba', neighborhood:'', category:'Residencial', images:[]}); setShowForm(true); }} className="btn-add-anuncio"><Plus size={16}/> Novo Anúncio</button>
          <button onClick={handleLogout} className="text-slate-500 hover:text-white transition"><LogOut size={18}/></button>
        </div>
      </nav>

      <main className="admin-main-container">
        {activeTab === 'properties' ? (
          <div className="layout-split">
            {/* LISTA DE ANÚNCIOS (VISÃO MARKETPLACE) */}
            <div className={`ads-list-panel ${showForm ? 'minimized' : ''}`}>
              <div className="panel-header">
                <h2>Meus Anúncios <span className="badge">{properties.length}</span></h2>
                <div className="search-box">
                  <Search size={16} className="text-slate-500" />
                  <input type="text" placeholder="Buscar imóvel..." />
                </div>
              </div>

              <div className="ads-grid">
                {properties.map(prop => (
                  <div key={prop.id} className="ad-card-row" onClick={() => handleEdit(prop)}>
                    <div className="ad-thumb">
                      <img src={prop.images?.[0] || '/images/property1.png'} alt="" />
                      {prop.category === 'Alto Padrão' && <span className="premium-tag">PREMIUM</span>}
                    </div>
                    <div className="ad-info">
                      <h3>{prop.title}</h3>
                      <p><MapPin size={12}/> {prop.neighborhood}, {prop.city}</p>
                      <div className="flex items-end justify-between">
                        <span className="price">R$ {prop.price?.toLocaleString('pt-BR')}</span>
                        <div className="actions">
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(prop); }} className="btn-icon"><Edit3 size={14}/></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(prop.id); }} className="btn-icon text-red-500"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FORMULÁRIO DE EDIÇÃO (MODO MARKETPLACE 3 COLUNAS) */}
            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="marketplace-form-overlay">
                  <div className="marketplace-grid-3">
                    {/* COLUNA 1: MINIATURAS ADAPTÁVEIS */}
                    <div className="col-thumbnails">
                      <div className="col-header"><h3>Fotos ({formData.images.length})</h3></div>
                      <div className="thumbs-scroll-area">
                        <div className="thumbs-grid">
                          {formData.images.map((img, i) => (
                            <div key={i} className={`thumb-slot ${activeImgIndex === i ? 'active' : ''}`} onClick={() => setActiveImgIndex(i)}>
                              <img src={img} alt="" />
                              <button className="btn-remove-photo" onClick={(e) => { e.stopPropagation(); setFormData({...formData, images: formData.images.filter((_, idx) => idx !== i)}); }}>
                                <X size={12}/>
                              </button>
                              {i === 0 && <span className="capa-label">CAPA</span>}
                            </div>
                          ))}
                          {/* Slot vazio para incentivar adição */}
                          <div className="thumb-slot empty">
                            <ImageIcon size={20} className="text-slate-800" />
                          </div>
                        </div>
                      </div>
                      <div className="add-url-section">
                        <p className="hint">Cole o link do Google Drive abaixo:</p>
                        <form onSubmit={handleExternalUrlAdd} className="url-form">
                          <input type="text" placeholder="https://drive.google.com/..." value={externalUrl} onChange={e => setExternalUrl(e.target.value)} />
                          <button type="submit"><Plus size={18}/></button>
                        </form>
                      </div>
                    </div>

                    {/* COLUNA 2: PREVIEW AMPLIADO */}
                    <div className="col-preview">
                      <div className="preview-stage">
                        <button className="btn-close-market" onClick={() => setShowForm(false)}><X size={24}/></button>
                        <AnimatePresence mode="wait">
                          <motion.img 
                            key={activeImgIndex} 
                            src={formData.images[activeImgIndex] || '/images/property1.png'} 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            className="main-preview-img"
                          />
                        </AnimatePresence>
                        {formData.images.length > 1 && (
                          <div className="nav-btns">
                            <button onClick={() => setActiveImgIndex(prev => (prev > 0 ? prev - 1 : formData.images.length - 1))}><ChevronLeft/></button>
                            <button onClick={() => setActiveImgIndex(prev => (prev < formData.images.length - 1 ? prev + 1 : 0))}><ChevronRight/></button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* COLUNA 3: FORMULÁRIO DE DADOS */}
                    <div className="col-form-details">
                      <div className="col-header"><h3>Detalhes do Anúncio</h3></div>
                      <form onSubmit={handleSubmit} className="details-form">
                        <div className="field">
                          <label>Título do Anúncio</label>
                          <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Apto 118m² 3 Quartos" />
                        </div>
                        <div className="field-row">
                          <div className="field">
                            <label>Preço de Venda (R$)</label>
                            <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0.00" />
                          </div>
                          <div className="field">
                            <label>Categoria</label>
                            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                              <option>Residencial</option>
                              <option>Alto Padrão</option>
                              <option>Terreno</option>
                            </select>
                          </div>
                        </div>
                        <div className="field">
                          <label>Bairro</label>
                          <input type="text" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} placeholder="Ex: Centro" />
                        </div>
                        <div className="field">
                          <label>Descrição Completa</label>
                          <textarea rows="8" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Conte os detalhes do imóvel..." />
                        </div>
                        <button type="submit" className="btn-save-market" disabled={loading}>
                          <Save size={18}/> {loading ? 'Sincronizando...' : 'Publicar no Site'}
                        </button>
                      </form>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* CONFIGURAÇÕES DE BIOGRAFIA */
          <div className="max-w-4xl mx-auto p-10">
            <div className="glass-panel p-10">
              <h2 className="text-2xl font-black mb-6">Biografia Institucional</h2>
              <textarea 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-300 min-h-[400px] outline-none focus:border-yellow-500" 
                value={siteConfigs.about_bio} 
                onChange={e => setSiteConfigs({...siteConfigs, about_bio: e.target.value})}
              />
              <button 
                onClick={() => handleUpdateConfig(siteConfigs)}
                className="mt-6 bg-yellow-500 text-slate-950 font-black px-10 py-4 rounded-xl uppercase tracking-widest text-sm"
              >
                Salvar Biografia
              </button>
            </div>
          </div>
        )}
      </main>
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-top-nav { height: 70px; background: rgba(15, 23, 42, 0.8); backdrop-blur: 20px; border-bottom: 1px solid #1e293b; padding: 0 2rem; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000; }
        .nav-link { color: #64748b; font-weight: 800; font-size: 0.85rem; text-transform: uppercase; padding: 0.5rem; transition: 0.3s; }
        .nav-link.active { color: #fff; border-bottom: 2px solid #eab308; }
        .btn-add-anuncio { background: #eab308; color: #020617; padding: 0.6rem 1.2rem; border-radius: 10px; font-weight: 900; font-size: 0.8rem; text-transform: uppercase; display: flex; align-items: center; gap: 0.5rem; }
        
        .admin-main-container { flex-grow: 1; position: relative; overflow: hidden; }
        .layout-split { min-height: 100% }
        
        .ads-list-panel { max-width: 1400px; margin: 0 auto; padding: 3rem 2rem; transition: 0.5s; width: 100%; }
        .ads-list-panel.minimized { opacity: 0.2; pointer-events: none; transform: scale(0.98); }
        .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
        .panel-header h2 { font-size: 2rem; font-weight: 900; letter-spacing: -1px; }
        .badge { background: #1e293b; color: #eab308; padding: 2px 10px; border-radius: 20px; font-size: 0.8rem; margin-left: 0.5rem; }
        .search-box { background: #0f172a; border: 1px solid #1e293b; padding: 0.6rem 1rem; border-radius: 10px; display: flex; align-items: center; gap: 0.8rem; width: 300px; }
        .search-box input { background: transparent; border: none; color: #fff; outline: none; font-size: 0.9rem; }
        
        .ads-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; padding-bottom: 100px; width: 100%; }
        .ad-card-row { background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; display: flex; cursor: pointer; transition: 0.3s; }
        .ad-card-row:hover { border-color: #eab308; transform: translateY(-4px); }
        .ad-thumb { width: 140px; height: 140px; position: relative; background: #1e293b; flex-shrink: 0; }
        .ad-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .premium-tag { position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.8); color: #eab308; font-size: 8px; font-weight: 900; padding: 3px 6px; border: 1px solid #eab308; }
        .ad-info { padding: 1rem; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }
        .ad-info h3 { font-size: 0.9rem; font-weight: 800; color: #f8fafc; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ad-info p { font-size: 0.75rem; color: #64748b; margin: 4px 0; display: flex; align-items: center; gap: 4px; }
        .price { font-size: 1.1rem; font-weight: 900; color: #eab308; }
        .btn-icon { background: rgba(255,255,255,0.05); border: none; color: #fff; padding: 6px; border-radius: 6px; }

        .marketplace-form-overlay { position: fixed; inset: 0; background: #020617; z-index: 2000; overflow-y: auto; overflow-x: hidden; }
        .marketplace-grid-3 { min-height: 100vh; display: grid; grid-template-columns: 280px 1fr 380px; }
        
        .col-thumbnails { border-right: 1px solid #1e293b; background: #070b14; padding: 1.5rem; display: flex; flex-direction: column; overflow: hidden; }
        .thumbs-scroll-area { flex-grow: 1; overflow-y: auto; padding-right: 0.5rem; margin-bottom: 1.5rem; }
        .col-header h3 { font-size: 0.8rem; font-weight: 900; color: #eab308; text-transform: uppercase; margin-bottom: 1.5rem; }
        .thumbs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
        .thumb-slot { aspect-ratio: 1; background: #0f172a; border: 2px solid #1e293b; border-radius: 12px; position: relative; overflow: hidden; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
        .thumb-slot.active { border-color: #eab308; box-shadow: 0 0 20px rgba(234, 179, 8, 0.2); }
        .thumb-slot img { width: 100%; height: 100%; object-fit: cover; }
        .btn-remove-photo { position: absolute; top: 4px; right: 4px; background: #ef4444; color: #fff; border: none; padding: 4px; border-radius: 4px; }
        .capa-label { position: absolute; bottom: 0; left: 0; right: 0; background: #eab308; color: #020617; font-size: 8px; font-weight: 900; text-align: center; }
        .add-url-section { margin-top: auto; padding-top: 2rem; }
        .hint { font-size: 0.7rem; color: #64748b; margin-bottom: 0.8rem; font-weight: 800; }
        .url-form { display: flex; gap: 4px; }
        .url-form input { background: #0f172a; border: 1px solid #1e293b; padding: 0.8rem; border-radius: 8px; color: #fff; font-size: 0.8rem; flex-grow: 1; }
        .url-form button { background: #eab308; color: #020617; padding: 0.8rem; border-radius: 8px; border: none; flex-shrink: 0; }

        .col-preview { background: #020617; display: flex; align-items: center; justify-content: center; position: relative; padding: 4rem; }
        .preview-stage { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; }
        .main-preview-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 20px; box-shadow: 0 40px 100px rgba(0,0,0,0.5); }
        .btn-close-market { position: absolute; top: -10px; right: -10px; background: #1e293b; color: #fff; border: none; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 100; transition: 0.3s; }
        .btn-close-market:hover { background: #ef4444; }
        .nav-btns { position: absolute; width: 100%; display: flex; justify-content: space-between; padding: 0 2rem; pointer-events: none; }
        .nav-btns button { pointer-events: auto; background: rgba(15, 23, 42, 0.5); border: 1px solid #1e293b; color: #fff; width: 50px; height: 50px; border-radius: 50%; opacity: 0.5; transition: 0.3s; }

        .col-form-details { background: #070b14; border-left: 1px solid #1e293b; padding: 2rem; overflow-y: auto; padding-bottom: 200px; }
        .details-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .field label { display: block; font-size: 0.75rem; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 0.6rem; }
        .field input, .field select, .field textarea { width: 100%; background: #0f172a; border: 1px solid #1e293b; padding: 1rem; border-radius: 10px; color: #fff; font-size: 0.9rem; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .btn-save-market { background: #eab308; color: #020617; padding: 1.2rem; border-radius: 12px; font-weight: 900; text-transform: uppercase; border: none; display: flex; align-items: center; justify-content: center; gap: 0.8rem; margin-top: 2rem; transition: 0.3s; }
        .glass-panel { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; }
      ` }} />
    </div>
  );
}
