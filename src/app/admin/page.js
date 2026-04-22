'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  FileText, Settings, LogOut, Plus, Trash2, Edit3, 
  Image as ImageIcon, UploadCloud, MapPin, DollarSign,
  Search, CheckCircle, X, Maximize2, ExternalLink, ChevronDown, AlertTriangle, Link as LinkIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';
import AdminLogin from '@/components/AdminLogin';

export default function AdminPage() {
  const [session, setSession] = useState(null);
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
    about_bio: `Sou corretor de imóveis com uma visão que vai além da simples negociação...`,
    contact_email: 'levimpantarotto@gmail.com',
    contact_phone: '(48) 99945-9527',
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProperties();
        fetchSiteConfigs();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProperties();
        fetchSiteConfigs();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProperties() {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setSyncError(`Erro de conexão: ${error.message}`);
    else setProperties(data || []);
    setLoading(false);
  }

  async function fetchSiteConfigs() {
    const { data } = await supabase.from('site_configs').select('*');
    if (data) {
      const configs = {};
      data.forEach(item => { configs[item.key] = item.value; });
      setSiteConfigs(prev => ({ ...prev, ...configs }));
    }
  }

  const handleUpdateConfig = async (key, value) => {
    const { error } = await supabase.from('site_configs').upsert({ key, value }, { onConflict: 'key' });
    if (error) setSyncError(`Erro de config: ${error.message}`);
    else fetchSiteConfigs();
  };

  const handleNewProperty = () => {
    setEditingId(null);
    setSyncError(null);
    setFormData({ title: '', description: '', price: '', city: 'Imbituba', neighborhood: '', category: 'Residencial', images: [] });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleExternalUrlAdd = (e) => {
    e.preventDefault();
    if (!externalUrl.trim()) return;
    if (!externalUrl.startsWith('http')) {
      setSyncError('A URL deve começar com http:// ou https://');
      return;
    }
    setFormData(prev => ({ ...prev, images: [...prev.images, externalUrl.trim()] }));
    setExternalUrl('');
    setSyncError(null);
  };

  const handleMultiFileUpload = async (e) => {
    setSyncError(null);
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    const newImages = [...formData.images];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `property-images/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('properties').upload(filePath, file);
      if (uploadError) {
        setSyncError(`Falha no Storage: ${uploadError.message}. Use a opção de URL externa se o limite de espaço foi atingido.`);
        break;
      } else {
        const { data: { publicUrl } } = supabase.storage.from('properties').getPublicUrl(filePath);
        newImages.push(publicUrl);
      }
    }
    setFormData(prev => ({ ...prev, images: newImages }));
    setUploading(false);
  };

  const handleEdit = (prop) => {
    setSyncError(null);
    setEditingId(prop.id);
    setFormData({
      title: prop.title,
      description: prop.description,
      price: prop.price,
      city: prop.city || 'Imbituba',
      neighborhood: prop.neighborhood || '',
      category: prop.category || 'Residencial',
      images: prop.images || []
    });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSyncError(null);
    setLoading(true);
    const payload = { ...formData, price: parseFloat(formData.price) };
    const { error } = editingId 
      ? await supabase.from('properties').update(payload).eq('id', editingId)
      : await supabase.from('properties').insert([payload]);
    
    if (error) setSyncError(`Erro ao salvar: ${error.message}`);
    else { setShowForm(false); fetchProperties(); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir imóvel?')) return;
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) setSyncError(`Erro ao excluir: ${error.message}`);
    else fetchProperties();
  };

  const getValidImageUrl = (img) => {
    if (!img) return '/images/property1.png';
    if (img.startsWith('/images') || img.startsWith('http')) return img;
    return '/images/property1.png';
  };

  if (!session) return <AdminLogin />;

  return (
    <div className="admin-page-v4">
      <main className="admin-main">
        <header className="fixed-header">
          <div className="container header-flex">
            <div className="admin-brand">
              <img src="/images/logo-trimmed.png" alt="" className="admin-logo-v4" />
              <div className="brand-text">
                <h1>Painel Administrativo</h1>
                <p>Gestão Profissional • Charles R. Nobre</p>
              </div>
            </div>
            <div className="header-actions">
              <button onClick={handleNewProperty} className="btn-create-head"><Plus size={18} /> Novo Imóvel</button>
              <nav className="admin-nav-pills">
                <button onClick={() => setActiveTab('properties')} className={activeTab === 'properties' ? 'active' : ''}><FileText size={16} /> Imóveis</button>
                <button onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'active' : ''}><Settings size={16} /> Configurações</button>
              </nav>
              <button onClick={() => supabase.auth.signOut()} className="btn-exit"><LogOut size={16} /> Sair</button>
            </div>
          </div>
          <AnimatePresence>
            {syncError && (
              <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="container mt-4">
                <div className="sync-error-banner"><AlertTriangle size={20} /><span>{syncError}</span><button onClick={() => setSyncError(null)}><X size={16} /></button></div>
              </motion.div>
            )}
          </AnimatePresence>
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
                            <h2>{editingId ? 'Editando Propriedade' : 'Cadastrar Novo Imóvel'}</h2>
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
                            <label>Banco de Imagens (Upload ou URL)</label>
                            <div className="dropzone-v4" onClick={() => document.getElementById('file-up').click()}>
                              {uploading ? 'Processando Arquivos...' : <><UploadCloud size={24} /><span>Upload Local</span></>}
                              <input id="file-up" type="file" multiple hidden onChange={handleMultiFileUpload} accept="image/*" />
                            </div>
                            <div className="divider-v4"><span>OU</span></div>
                            <div className="url-input-v4">
                              <input type="text" placeholder="Cole o link da foto aqui..." value={externalUrl} onChange={e => setExternalUrl(e.target.value)} />
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
                            <button type="submit" disabled={loading} className="btn-submit-v4">{loading ? 'Sincronizando...' : 'Publicar Alterações'}</button>
                          </div>
                        </form>
                      </section>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="properties-feed-v4">
                  <div className="feed-header-v4"><h2>Imóveis Ativos <span className="count-badge">{properties.length}</span></h2></div>
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
                              <button onClick={() => handleEdit(prop)} className="btn-edit-mini"><Edit3 size={14}/></button>
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
              <div className="glass-card p-10">
                <textarea rows="12" className="institucional-textarea" value={siteConfigs.about_bio} onChange={e => handleUpdateConfig('about_bio', e.target.value)} />
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
        .admin-brand { display: flex; align-items: center; gap: 1.2rem; }
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
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-gallery-fields { background: rgba(30, 41, 59, 0.4); padding: 1.5rem; border-radius: 15px; }
        .dropzone-v4 { border: 2px dashed #475569; padding: 1.5rem; text-align: center; cursor: pointer; border-radius: 12px; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; font-weight: 800; }
        .divider-v4 { text-align: center; position: relative; margin: 1.5rem 0; }
        .divider-v4::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #334155; }
        .divider-v4 span { position: relative; background: #263344; padding: 0 10px; color: #475569; font-size: 0.7rem; font-weight: 900; }
        .url-input-v4 { display: flex; gap: 0.5rem; }
        .url-input-v4 input { flex-grow: 1; background: #0f172a; border: 1px solid #334155; padding: 0.8rem; border-radius: 8px; color: #fff; }
        .btn-add-url { background: #eab308; border: none; padding: 0.8rem; border-radius: 8px; color: #020617; }
        .reorder-flex-grid { display: flex; gap: 1rem; overflow-x: auto; margin-top: 1.5rem; padding: 0.5rem; }
        .reorder-item-v4 { cursor: grab; }
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
        .prop-actions-btns { display: flex; gap: 0.5rem; }
        .btn-edit-mini, .btn-del-mini { background: #334155; color: #fff; border: none; padding: 0.5rem; border-radius: 6px; }
        .btn-del-mini { background: #ef4444; }
        .count-badge { background: #eab308; color: #020617; padding: 2px 10px; border-radius: 20px; font-size: 0.8rem; margin-left: 0.5rem; }
        .lightbox-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 3rem; }
        .lightbox-overlay img { max-width: 90%; max-height: 90%; border-radius: 12px; }
        .institucional-textarea { width: 100%; background: #020617; border: 1px solid #1e293b; padding: 1.5rem; border-radius: 15px; color: #fff; font-size: 1.1rem; line-height: 1.6; }
      `}</style>
    </div>
  );
}
