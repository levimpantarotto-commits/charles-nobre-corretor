'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  FileText, Settings, LogOut, Plus, Trash2, Edit3, 
  Image as ImageIcon, UploadCloud, MapPin, DollarSign,
  Search, CheckCircle, X, Maximize2, ExternalLink, ChevronDown
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
  const [setupError, setSetupError] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  const formRef = useRef(null);
  const [siteConfigs, setSiteConfigs] = useState({
    about_bio: `Sou corretor de imóveis com uma visão que vai além da simples negociação — meu trabalho é conectar pessoas a espaços que fazem sentido para suas vidas.
    
Minha trajetória inclui experiências internacionais que ampliaram meu olhar sobre arquitetura, estilo de vida e valorização imobiliária...`,
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
    if (error) {
      console.error('Error fetching properties:', error);
      if (error.message.includes('relation "properties" does not exist')) setSetupError(true);
    } else setProperties(data || []);
    setLoading(false);
  }

  async function fetchSiteConfigs() {
    const { data, error } = await supabase.from('site_configs').select('*');
    if (error) console.error('Error fetching configs:', error);
    else if (data) {
      const configs = {};
      data.forEach(item => { configs[item.key] = item.value; });
      setSiteConfigs(prev => ({ ...prev, ...configs }));
    }
  }

  const handleUpdateConfig = async (key, value) => {
    const { error } = await supabase.from('site_configs').upsert({ key, value }, { onConflict: 'key' });
    if (error) alert('Erro ao atualizar: ' + error.message);
    else fetchSiteConfigs();
  };

  const handleNewProperty = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', price: '', city: 'Imbituba', neighborhood: '', category: 'Residencial', images: [] });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleMultiFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    const newImages = [...formData.images];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `property-images/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('properties').upload(filePath, file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('properties').getPublicUrl(filePath);
        newImages.push(publicUrl);
      }
    }
    setFormData(prev => ({ ...prev, images: newImages }));
    setUploading(false);
  };

  const handleEdit = (prop) => {
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
    setLoading(true);
    const payload = { ...formData, price: parseFloat(formData.price) };
    if (editingId) {
      const { error } = await supabase.from('properties').update(payload).eq('id', editingId);
      if (!error) {
        setEditingId(null);
        setShowForm(false);
        fetchProperties();
      }
    } else {
      const { error } = await supabase.from('properties').insert([payload]);
      if (!error) {
        setShowForm(false);
        fetchProperties();
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este imóvel?')) return;
    await supabase.from('properties').delete().eq('id', id);
    fetchProperties();
  };

  const updateImagesOrder = (newOrder) => {
    setFormData(prev => ({ ...prev, images: newOrder }));
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
              <button onClick={handleNewProperty} className="btn-create-head">
                <Plus size={18} /> Novo Imóvel
              </button>
              <nav className="admin-nav-pills">
                <button onClick={() => setActiveTab('properties')} className={activeTab === 'properties' ? 'active' : ''}>
                  <FileText size={16} /> Imóveis
                </button>
                <button onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'active' : ''}>
                  <Settings size={16} /> Configurações
                </button>
              </nav>
              <button onClick={() => supabase.auth.signOut()} className="btn-exit">
                <LogOut size={16} /> Sair
              </button>
            </div>
          </div>
        </header>

        <div className="container content-push">
          <AnimatePresence mode="wait">
            {activeTab === 'properties' ? (
              <motion.div key="p-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                
                {/* FORMULÁRIO DE CADASTRO (ANIMADO E OCULTÁVEL) */}
                <AnimatePresence>
                  {showForm && (
                    <motion.div 
                      ref={formRef}
                      initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginBottom: '4rem' }}
                      exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                      className="form-overflow-hidden"
                    >
                      <section className="glass-card premium-form-layout">
                        <div className="section-header">
                          <div className="header-label">
                            {editingId ? <Edit3 className="icon-edit-v4" /> : <Plus className="icon-plus-v4" />}
                            <h2>{editingId ? 'Editando Propriedade' : 'Cadastrar Novo Imóvel'}</h2>
                          </div>
                          <button onClick={() => setShowForm(false)} className="btn-close-form">
                            <X size={20} />
                          </button>
                        </div>

                        <form onSubmit={handleSubmit} className="form-grid-layout">
                          <div className="form-main-fields">
                            <div className="field-group">
                              <label>Título do Anúncio</label>
                              <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Casa Praia do Rosa com Vista Mar" />
                            </div>
                            
                            <div className="field-row">
                              <div className="field-group">
                                <label>Valor (R$)</label>
                                <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                              </div>
                              <div className="field-group">
                                <label>Categoria</label>
                                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                  <option>Residencial</option>
                                  <option>Alto Padrão</option>
                                  <option>Terreno</option>
                                  <option>Comercial</option>
                                </select>
                              </div>
                            </div>

                            <div className="field-row">
                              <div className="field-group">
                                <label>Cidade</label>
                                <select value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}>
                                  <option>Imbituba</option>
                                  <option>Garopaba</option>
                                  <option>Imaruí</option>
                                </select>
                              </div>
                              <div className="field-group">
                                <label>Bairro</label>
                                <input type="text" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} />
                              </div>
                            </div>

                            <div className="field-group">
                              <label>Descrição</label>
                              <textarea rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                            </div>
                          </div>

                          <div className="form-gallery-fields">
                            <label>Galeria (Arraste lateralmente para ordenar)</label>
                            <div className="dropzone-v4" onClick={() => document.getElementById('file-up').click()}>
                              <UploadCloud size={32} />
                              <span>Adicionar Fotos</span>
                              <input id="file-up" type="file" multiple hidden onChange={handleMultiFileUpload} accept="image/*" />
                            </div>

                            <div className="gallery-reorder-container">
                              <Reorder.Group 
                                axis="x" 
                                values={formData.images} 
                                onReorder={updateImagesOrder} 
                                className="reorder-flex-grid"
                              >
                                {formData.images.map((img, i) => (
                                  <Reorder.Item key={img} value={img} className="reorder-item-v4">
                                    <div className="reorder-img-card">
                                      <img src={img} alt="" onClick={() => setLightboxImg(img)} title="Clique para ampliar" />
                                      <button type="button" onClick={() => setFormData({...formData, images: formData.images.filter((_, idx) => idx !== i)})} className="btn-del-img-v4">
                                        <Trash2 size={12}/>
                                      </button>
                                      {i === 0 && <span className="capa-tag">CAPA</span>}
                                    </div>
                                  </Reorder.Item>
                                ))}
                              </Reorder.Group>
                            </div>
                          </div>

                          <div className="form-submit-footer">
                            <button type="submit" disabled={loading} className="btn-submit-v4">
                              {loading ? 'Sincronizando...' : (editingId ? 'Salvar Alterações' : 'Publicar Imóvel')}
                            </button>
                          </div>
                        </form>
                      </section>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* GRADE DE IMÓVEIS (4 COLUNAS) */}
                <div className="properties-feed-v4">
                  <div className="feed-header-v4">
                    <div className="header-meta">
                      <CheckCircle className="text-yellow-500" size={24} />
                      <h2>Imóveis Ativos <span className="count-badge">{properties.length}</span></h2>
                    </div>
                  </div>
                  
                  <div className="property-grid-4">
                    {properties.map(prop => (
                      <motion.div layout key={prop.id} className="prop-card-v4">
                        <div className="prop-img-wrap" onClick={() => handleEdit(prop)}>
                          <img src={prop.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1000&auto=format&fit=crop'} alt="" />
                          <div className="prop-badge">{prop.category}</div>
                          <div className="edit-overlay"><Edit3 size={24} /></div>
                        </div>
                        <div className="prop-data">
                          <h3>{prop.title}</h3>
                          <p><MapPin size={12} /> {prop.neighborhood}, {prop.city}</p>
                          <div className="prop-price-row">
                            <span className="price-tag">R$ {prop.price?.toLocaleString('pt-BR')}</span>
                            <div className="prop-actions-btns">
                              <button onClick={() => handleEdit(prop)} className="btn-edit-mini" title="Editar"><Edit3 size={14}/></button>
                              <button onClick={() => handleDelete(prop.id)} className="btn-del-mini" title="Excluir"><Trash2 size={14}/></button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="s-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="settings-grid-v4">
                <div className="glass-card p-10">
                  <div className="section-header">
                    <div className="header-label">
                      <Settings className="text-yellow-500" />
                      <h2>Textos Institucionais</h2>
                    </div>
                  </div>
                  <div className="field-group">
                    <label>Biografia do Sobre</label>
                    <textarea rows="12" className="institucional-textarea" value={siteConfigs.about_bio} onChange={e => setSiteConfigs({...siteConfigs, about_bio: e.target.value})} onBlur={e => handleUpdateConfig('about_bio', e.target.value)} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LIGHTBOX MODAL */}
        <AnimatePresence>
          {lightboxImg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lightbox-overlay" onClick={() => setLightboxImg(null)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="lightbox-content">
                <img src={lightboxImg} alt="Visualização expandida" />
                <button className="lightbox-close"><X size={32}/></button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      <style jsx>{`
        .admin-page-v4 { background: #020617; min-height: 100vh; color: #f8fafc; font-family: 'Inter', sans-serif; }
        
        .fixed-header { 
          background: rgba(15, 23, 42, 0.9); 
          backdrop-filter: blur(12px); 
          border-bottom: 2px solid #eab308; 
          position: sticky; 
          top: 0; 
          z-index: 1000; 
          padding: 0.8rem 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        
        .header-flex { display: flex; justify-content: space-between; align-items: center; }
        .admin-brand { display: flex; align-items: center; gap: 1.2rem; }
        .admin-logo-v4 { height: 45px; filter: brightness(1.1); }
        
        .brand-text h1 { font-size: 1.1rem; font-weight: 800; margin: 0; color: #fff; letter-spacing: -0.5px; }
        .brand-text p { font-size: 0.7rem; color: #eab308; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; margin: 0; }
        
        .header-actions { display: flex; align-items: center; gap: 1.2rem; }
        .btn-create-head { 
          background: #eab308; 
          color: #020617; 
          padding: 0.6rem 1.2rem; 
          border-radius: 8px; 
          font-weight: 900; 
          display: flex; 
          align-items: center; 
          gap: 0.5rem; 
          cursor: pointer; 
          border: none; 
          transition: 0.3s;
          text-transform: uppercase;
          font-size: 0.75rem;
        }
        .btn-create-head:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(234, 179, 8, 0.4); }
        
        .admin-nav-pills { display: flex; background: #1e293b; padding: 4px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
        .admin-nav-pills button { 
          background: transparent; 
          border: none; 
          padding: 0.6rem 1.2rem; 
          color: #94a3b8; 
          font-weight: 800; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          gap: 0.6rem; 
          border-radius: 8px; 
          transition: 0.3s;
          font-size: 0.8rem;
        }
        .admin-nav-pills button.active { background: #334155; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        
        .btn-exit { background: transparent; border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 0.8rem; }

        .content-push { padding-top: 3rem; padding-bottom: 6rem; }
        .form-overflow-hidden { overflow: hidden; }
        .glass-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .premium-form-layout { padding: 3rem; }
        
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; padding-bottom: 1.2rem; border-bottom: 1px solid #1e293b; }
        .header-label { display: flex; align-items: center; gap: 1rem; }
        .header-label h2 { font-size: 1.5rem; font-weight: 900; color: #fff; margin: 0; font-family: 'Playfair Display', serif; }
        .btn-close-form { background: rgba(255,255,255,0.05); color: #94a3b8; border: none; padding: 0.5rem; border-radius: 50%; cursor: pointer; transition: 0.3s; }
        .btn-close-form:hover { background: #ef4444; color: #fff; }

        .form-grid-layout { display: grid; grid-template-columns: 1fr 320px; gap: 4rem; }
        .field-group { margin-bottom: 1.8rem; }
        .field-group label { display: block; font-size: 0.8rem; font-weight: 900; color: #f8fafc; text-transform: uppercase; margin-bottom: 0.7rem; letter-spacing: 1px; }
        
        .field-group input, .field-group select, .field-group textarea { 
          width: 100%; 
          background: #1e293b; 
          border: 1px solid #334155; 
          padding: 1.1rem; 
          border-radius: 10px; 
          color: #fff; 
          font-size: 1rem; 
        }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }

        .form-gallery-fields { background: rgba(30, 41, 59, 0.4); padding: 1.5rem; border-radius: 15px; border: 1px solid #1e293b; overflow: hidden; }
        .dropzone-v4 { 
          border: 2px dashed #475569; 
          padding: 2.5rem 1rem; 
          border-radius: 15px; 
          text-align: center; 
          cursor: pointer; 
          color: #94a3b8; 
          font-weight: 900; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          gap: 1rem;
        }

        .gallery-reorder-container { margin-top: 2rem; overflow-x: auto; padding-bottom: 1rem; }
        .reorder-flex-grid { display: flex; gap: 1.2rem; min-width: max-content; padding: 0.5rem; }
        .reorder-item-v4 { cursor: grab; }
        .reorder-img-card { width: 100px; height: 100px; position: relative; border-radius: 12px; overflow: hidden; border: 2px solid #334155; }
        .reorder-img-card img { width: 100%; height: 100%; object-fit: cover; }
        .btn-del-img-v4 { position: absolute; top: 4px; right: 4px; background: #ef4444; color: #fff; border: none; padding: 4px; border-radius: 6px; cursor: pointer; z-index: 10; }
        .capa-tag { position: absolute; bottom: 0; left: 0; right: 0; background: #eab308; color: #020617; font-size: 9px; font-weight: 900; text-align: center; padding: 2px 0; }

        .btn-submit-v4 { 
          width: 100%; 
          background: #eab308; 
          color: #020617; 
          padding: 1.3rem; 
          border-radius: 15px; 
          font-weight: 900; 
          font-size: 1.2rem; 
          border: none; 
          cursor: pointer; 
          transition: 0.3s;
          text-transform: uppercase;
          margin-top: 2rem;
        }

        .feed-header-v4 { margin-bottom: 2.5rem; display: flex; justify-content: space-between; align-items: center; }
        .header-meta { display: flex; align-items: center; gap: 1rem; }
        .header-meta h2 { font-size: 1.4rem; font-weight: 800; margin: 0; color: #fff; }
        .count-badge { background: #eab308; color: #020617; padding: 2px 10px; border-radius: 20px; font-size: 0.9rem; margin-left: 0.5rem; }

        .property-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5rem; }
        .prop-card-v4 { background: #0f172a; border: 1px solid #1e293b; border-radius: 18px; overflow: hidden; transition: 0.4s; }
        .prop-card-v4:hover { border-color: #eab308; transform: translateY(-8px); }
        
        .prop-img-wrap { position: relative; height: 200px; cursor: pointer; overflow: hidden; }
        .prop-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
        .edit-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; color: #fff; }
        .prop-img-wrap:hover .edit-overlay { opacity: 1; }
        
        .prop-badge { position: absolute; top: 15px; left: 15px; background: rgba(15, 23, 42, 0.9); color: #eab308; padding: 6px 12px; border-radius: 8px; font-size: 10px; font-weight: 900; border: 1px solid #eab308; }
        
        .prop-data { padding: 1.5rem; }
        .prop-data h3 { font-size: 1.1rem; font-weight: 800; margin-bottom: 0.6rem; color: #fff !important; line-height: 1.4; height: 3rem; overflow: hidden; }
        .prop-data p { font-size: 0.85rem; color: #94a3b8; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; }
        
        .prop-price-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1.2rem; }
        .price-tag { color: #eab308; font-weight: 900; font-size: 1.2rem; }
        .btn-edit-mini, .btn-del-mini { border: none; padding: 0.6rem; border-radius: 8px; cursor: pointer; display: flex; }
        .btn-edit-mini { background: #38bdf8; color: #fff; }
        .btn-del-mini { background: #ef4444; color: #fff; }

        .lightbox-overlay { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.98); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 4rem; cursor: zoom-out; }
        .lightbox-content { position: relative; max-width: 90%; max-height: 90%; }
        .lightbox-content img { max-width: 100%; max-height: 90vh; border-radius: 12px; }
        .lightbox-close { position: absolute; top: -50px; right: 0; color: #fff; background: transparent; border: none; cursor: pointer; }

        .institucional-textarea { width: 100%; background: #020617; border: 1px solid #1e293b; padding: 1.5rem; border-radius: 15px; color: #fff; font-size: 1.1rem; line-height: 1.6; }

        @media (max-width: 1400px) { .property-grid-4 { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 1100px) { .form-grid-layout { grid-template-columns: 1fr; } .property-grid-4 { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 700px) { .property-grid-4 { grid-template-columns: 1fr; } .header-flex { flex-direction: column; gap: 1.5rem; } }
      `}</style>
    </div>
  );
}
