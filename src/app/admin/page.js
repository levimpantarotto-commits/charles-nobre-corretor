'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  FileText, Settings, LogOut, Plus, Trash2, Edit3, 
  Image as ImageIcon, UploadCloud, MapPin, Search, CheckCircle, X, Maximize2, 
  ExternalLink, ChevronDown, AlertTriangle, Link as LinkIcon
} from 'lucide-react';
import Footer from '@/components/Footer';

// Componente simples de login local para substituir o Supabase Auth
function LocalAdminLogin({ onLogin }) {
  const [pass, setPass] = useState('');
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <img src="/images/logo-trimmed.png" alt="" className="mx-auto mb-6 h-12" />
        <h2 className="mb-6 text-xl font-bold text-white">Acesso Restrito</h2>
        <input 
          type="password" 
          placeholder="Senha de Acesso"
          className="mb-4 w-full rounded-lg bg-slate-800 p-3 text-white border border-slate-700" 
          value={pass} 
          onChange={e => setPass(e.target.value)}
        />
        <button 
          onClick={() => pass === '12345' ? onLogin() : alert('Senha incorreta')}
          className="w-full rounded-lg bg-yellow-500 p-3 font-bold text-slate-900 hover:bg-yellow-400 transition"
        >
          Entrar no Painel
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('properties');
  const [lightboxImg, setLightboxImg] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [externalUrl, setExternalUrl] = useState('');
  
  const formRef = useRef(null);
  const [siteConfigs, setSiteConfigs] = useState({
    about_bio: '',
    contact_email: '',
    contact_phone: '',
  });
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    city: 'Imbituba',
    neighborhood: '',
    category: 'Residencial',
    images: []
  });

  useEffect(() => {
    if (isLoggedIn) {
      fetchProperties();
      fetchSiteConfigs();
    }
  }, [isLoggedIn]);

  async function fetchProperties() {
    try {
      setLoading(true);
      const res = await fetch('/api/properties');
      const data = await res.json();
      setProperties(data || []);
    } catch (err) {
      setSyncError('Erro ao carregar dados locais.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSiteConfigs() {
    try {
      const res = await fetch('/api/configs');
      const data = await res.json();
      setSiteConfigs(data);
    } catch (err) {
      console.error('Config fetch error');
    }
  }

  const handleUpdateConfig = async (newConfigs) => {
    try {
      const res = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfigs)
      });
      if (res.ok) fetchSiteConfigs();
    } catch (err) {
      console.error('Erro ao salvar configurações.');
    }
  };

  const handleNewProperty = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', price: '', city: 'Imbituba', neighborhood: '', category: 'Residencial', images: [] });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Conversor Inteligente de Links do Google Drive
  const convertGoogleDriveLink = (url) => {
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/(.+?)\/(view|edit)/) || url.match(/id=(.+?)(&|$)/);
      if (match && match[1]) {
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
      }
    }
    return url;
  };

  const handleExternalUrlAdd = (e) => {
    e.preventDefault();
    if (!externalUrl.trim()) return;
    const finalUrl = convertGoogleDriveLink(externalUrl.trim());
    setFormData(prev => ({ ...prev, images: [...prev.images, finalUrl] }));
    setExternalUrl('');
  };

  const handleEdit = (prop) => {
    setEditingId(prop.id);
    setFormData({ ...prop, price: prop.price.toString() });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Preparar lista atualizada
    let newList;
    const itemToSave = { 
      ...formData, 
      id: editingId || `imob-${Date.now()}`,
      price: parseFloat(formData.price)
    };

    if (editingId) {
      newList = properties.map(p => p.id === editingId ? itemToSave : p);
    } else {
      newList = [itemToSave, ...properties];
    }

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newList)
      });
      
      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);
      
      setShowForm(false);
      fetchProperties();
    } catch (err) {
      setSyncError(`ERRO AO SALVAR: ${err.message}. Certifique-se que está rodando em ambiente local (npm run dev).`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir imóvel fisicamente do arquivo?')) return;
    const newList = properties.filter(p => p.id !== id);
    try {
      await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newList)
      });
      fetchProperties();
    } catch (err) {
      setSyncError('Erro ao deletar do arquivo.');
    }
  };

  const getValidImageUrl = (img) => {
    if (!img) return '/images/property1.png';
    if (img.startsWith('/images') || img.startsWith('http')) return img;
    return '/images/property1.png';
  };

  if (!isLoggedIn) return <LocalAdminLogin onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="admin-page-v4">
      <main className="admin-main">
        <header className="fixed-header">
          <div className="container header-flex">
            <div className="admin-brand">
              <img src="/images/logo-trimmed.png" alt="" className="admin-logo-v4" />
              <div className="brand-text">
                <h1>Painel Administrativo</h1>
                <p>Gestão Estática • Modo Local</p>
              </div>
            </div>
            <div className="header-actions">
              <button onClick={handleNewProperty} className="btn-create-head"><Plus size={18} /> Novo Imóvel</button>
              <nav className="admin-nav-pills">
                <button onClick={() => setActiveTab('properties')} className={activeTab === 'properties' ? 'active' : ''}><FileText size={16} /> Imóveis</button>
                <button onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'active' : ''}><Settings size={16} /> Bio</button>
              </nav>
              <button onClick={() => setIsLoggedIn(false)} className="btn-exit"><LogOut size={16} /> Sair</button>
            </div>
          </div>
        </header>

        <div className="container content-push">
          <AnimatePresence mode="wait">
            {activeTab === 'properties' ? (
              <motion.div key="p-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AnimatePresence>
                  {showForm && (
                    <motion.div ref={formRef} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="form-overflow-hidden">
                      <section className="glass-card premium-form-layout">
                        <div className="section-header">
                          <div className="header-label">
                            {editingId ? <Edit3 className="icon-edit-v4" /> : <Plus className="icon-plus-v4" />}
                            <h2>{editingId ? 'Editando Propriedade' : 'Cadastrar No Arquivo'}</h2>
                          </div>
                          <button onClick={() => setShowForm(false)} className="btn-close-form"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="form-grid-layout">
                          <div className="form-main-fields">
                            <div className="field-group"><label>Título</label><input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                            <div className="field-row">
                              <div className="field-group"><label>Valor (R$)</label><input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} /></div>
                              <div className="field-group"><label>Categoria</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option>Residencial</option><option>Alto Padrão</option><option>Terreno</option></select></div>
                            </div>
                            <div className="field-group"><label>Descrição</label><textarea rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                          </div>
                          <div className="form-gallery-fields">
                            <label>Banco de Imagens (Google Drive ou Links Externos)</label>
                            <p className="text-xs text-yellow-500 mb-4">* Cole o link de compartilhamento do Google Drive abaixo. O sistema converterá automaticamente.</p>
                            <div className="url-input-v4">
                              <input type="text" placeholder="Cole o link do Google Drive aqui..." value={externalUrl} onChange={e => setExternalUrl(e.target.value)} />
                              <button onClick={handleExternalUrlAdd} className="btn-add-url"><LinkIcon size={16} /></button>
                            </div>
                            <Reorder.Group axis="x" values={formData.images} onReorder={imgs => setFormData({...formData, images: imgs})} className="reorder-flex-grid">
                              {formData.images.map((img, i) => (
                                <Reorder.Item key={img} value={img} className="reorder-item-v4">
                                  <div className="reorder-img-card">
                                    <img src={getValidImageUrl(img)} alt="" onClick={() => setLightboxImg(img)} />
                                    <button type="button" onClick={() => setFormData({...formData, images: formData.images.filter((_, idx) => idx !== i)})} className="btn-del-img-v4"><Trash2 size={12}/></button>
                                    {i === 0 && <span className="capa-tag">CAPA</span>}
                                  </div>
                                </Reorder.Item>
                              ))}
                            </Reorder.Group>
                          </div>
                          <div className="form-submit-footer">
                            <button type="submit" disabled={loading} className="btn-submit-v4">{loading ? 'Gravando no Arquivo...' : 'Salvar no listings.json'}</button>
                          </div>
                        </form>
                      </section>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="properties-feed-v4">
                  <div className="feed-header-v4"><h2>Registros no Arquivo <span className="count-badge">{properties.length}</span></h2></div>
                  <div className="property-grid-4">
                    {properties.map(prop => (
                      <motion.div layout key={prop.id} className="prop-card-v4">
                        <div className="prop-img-wrap" onClick={() => handleEdit(prop)}>
                          <img src={getValidImageUrl(prop.images?.[0])} alt="" />
                          <div className="edit-overlay"><Edit3 size={24} /></div>
                        </div>
                        <div className="prop-data">
                          <h3>{prop.title}</h3>
                          <div className="prop-price-row">
                            <span className="price-tag">R$ {prop.price?.toLocaleString('pt-BR')}</span>
                            <div className="prop-actions-btns">
                              <button onClick={() => handleDelete(prop.id)} className="btn-del-mini"><Trash2 size={14}/></button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="glass-card">
                 <label className="block text-slate-400 font-bold mb-4">Editar Biografia Institucional</label>
                <textarea 
                  rows="12" 
                  className="institucional-textarea" 
                  value={siteConfigs.about_bio} 
                  onChange={e => setSiteConfigs({...siteConfigs, about_bio: e.target.value})} 
                />
                <button 
                  onClick={() => handleUpdateConfig(siteConfigs)}
                  className="mt-6 w-full py-3 bg-yellow-500 rounded-lg text-slate-900 font-bold"
                >
                  Salvar Bio em site_configs.json
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>{lightboxImg && <div className="lightbox-overlay" onClick={() => setLightboxImg(null)}><img src={lightboxImg} alt="" /></div>}</AnimatePresence>
      </main>
      <Footer />
      <style jsx>{`
        .admin-page-v4 { background: #020617; min-height: 100vh; color: #f8fafc; font-family: 'Inter', sans-serif; }
        .fixed-header { background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px); border-bottom: 2px solid #eab308; position: sticky; top: 0; z-index: 1000; padding: 0.8rem 0; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; }
        .admin-logo-v4 { height: 45px; }
        .brand-text h1 { font-size: 1.1rem; font-weight: 800; margin: 0; }
        .brand-text p { font-size: 0.7rem; color: #eab308; text-transform: uppercase; margin: 0; }
        .sync-error-banner { background: #fee2e2; border: 1px solid #ef4444; color: #b91c1c; padding: 1rem; border-radius: 12px; display: flex; align-items: center; gap: 1rem; font-weight: 800; }
        .sync-error-banner button { margin-left: auto; background: transparent; border: none; color: #b91c1c; }
        .btn-create-head { background: #eab308; color: #020617; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 900; border: none; }
        .admin-nav-pills { display: flex; background: #1e293b; padding: 4px; border-radius: 10px; }
        .admin-nav-pills button { background: transparent; border: none; padding: 0.6rem; color: #94a3b8; font-weight: 800; border-radius: 8px; }
        .admin-nav-pills button.active { background: #334155; color: #fff; }
        .btn-exit { background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 0.5rem; border-radius: 8px; }
        .content-push { padding-top: 3rem; padding-bottom: 6rem; }
        .glass-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 2rem; }
        .form-grid-layout { display: grid; grid-template-columns: 1fr 320px; gap: 3rem; }
        .field-group { margin-bottom: 1.5rem; }
        .field-group label { display: block; font-size: 0.75rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.5rem; }
        .field-group input, .field-group select, .field-group textarea { width: 100%; background: #1e293b; border: 1px solid #334155; padding: 1rem; border-radius: 8px; color: #fff; }
        .divider-v4 { text-align: center; position: relative; margin: 1.5rem 0; }
        .url-input-v4 { display: flex; gap: 0.5rem; }
        .url-input-v4 input { flex-grow: 1; background: #0f172a; border: 1px solid #334155; padding: 0.8rem; border-radius: 8px; color: #fff; }
        .btn-add-url { background: #eab308; border: none; padding: 0.8rem; border-radius: 8px; color: #020617; }
        .reorder-flex-grid { display: flex; gap: 1rem; overflow-x: auto; margin-top: 1.5rem; padding: 0.5rem; }
        .reorder-img-card { width: 90px; height: 90px; position: relative; border-radius: 10px; overflow: hidden; border: 2px solid #334155; }
        .reorder-img-card img { width: 100%; height: 100%; object-fit: cover; }
        .btn-del-img-v4 { position: absolute; top: 4px; right: 4px; background: #ef4444; color: #fff; border: none; padding: 4px; border-radius: 6px; }
        .capa-tag { position: absolute; bottom: 0; left: 0; right: 0; background: #eab308; color: #020617; font-size: 8px; font-weight: 900; text-align: center; }
        .btn-submit-v4 { width: 100%; background: #eab308; color: #020617; padding: 1.2rem; border-radius: 12px; font-weight: 900; border: none; }
        .property-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
        .prop-card-v4 { background: #0f172a; border: 1px solid #1e293b; border-radius: 15px; overflow: hidden; }
        .prop-img-wrap { height: 160px; position: relative; cursor: pointer; }
        .prop-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .edit-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; color: #fff; transition: 0.3s; }
        .prop-img-wrap:hover .edit-overlay { opacity: 1; }
        .prop-data { padding: 1.2rem; }
        .prop-data h3 { font-size: 0.95rem; font-weight: 800; margin-bottom: 0.8rem; height: 2.5rem; overflow: hidden; color: #fff; }
        .prop-price-row { display: flex; justify-content: space-between; align-items: center; }
        .price-tag { color: #eab308; font-weight: 900; font-size: 1.1rem; }
        .btn-del-mini { background: #ef4444; color: #fff; border: none; padding: 0.5rem; border-radius: 6px; }
        .count-badge { background: #eab308; color: #020617; padding: 2px 10px; border-radius: 20px; font-size: 0.8rem; margin-left: 0.5rem; }
        .lightbox-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 3rem; }
        .lightbox-overlay img { max-width: 90%; max-height: 90%; border-radius: 12px; }
        .institucional-textarea { width: 100%; background: #020617; border: 1px solid #1e293b; padding: 1.5rem; border-radius: 15px; color: #fff; font-size: 1.1rem; line-height: 1.6; }
      `}</style>
    </div>
  );
}
