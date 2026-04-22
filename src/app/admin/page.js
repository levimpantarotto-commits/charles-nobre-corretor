'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  FileText, Settings, LogOut, Plus, Trash2, Edit3, 
  Image as ImageIcon, UploadCloud, MapPin, DollarSign,
  Search, CheckCircle, X, Maximize2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminLogin from '@/components/AdminLogin';

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('properties');
  const [siteConfigs, setSiteConfigs] = useState({
    about_bio: '',
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
    
    if (error) console.error('Error fetching:', error);
    else setProperties(data || []);
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

  const handleMultiFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const newImages = [...formData.images];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `property-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('properties')
        .upload(filePath, file);

      if (uploadError) {
        alert('Erro ao subir imagem: ' + uploadError.message);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('properties')
          .getPublicUrl(filePath);
        newImages.push(publicUrl);
      }
    }

    setFormData(prev => ({ ...prev, images: newImages }));
    setUploading(false);
  };

  const reorderImages = (newOrder) => {
    setFormData(prev => ({ ...prev, images: newOrder }));
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalImages = formData.images.length > 0 ? formData.images : ['/images/property1.png'];
    setLoading(true);
    
    const payload = {
      ...formData,
      images: finalImages,
      price: parseFloat(formData.price)
    };

    if (editingId) {
      const { error } = await supabase.from('properties').update(payload).eq('id', editingId);
      if (error) alert('Erro ao atualizar: ' + error.message);
      else {
        alert('Imóvel atualizado com sucesso! ✨');
        setEditingId(null);
        setFormData({ title: '', description: '', price: '', city: 'Imbituba', neighborhood: '', category: 'Residencial', images: [] });
        fetchProperties();
      }
    } else {
      const { error } = await supabase.from('properties').insert([payload]);
      if (error) alert('Erro ao salvar: ' + error.message);
      else {
        alert('Imóvel cadastrado com sucesso! ✨');
        setFormData({ title: '', description: '', price: '', city: 'Imbituba', neighborhood: '', category: 'Residencial', images: [] });
        fetchProperties();
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este imóvel?')) return;
    
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) alert('Erro ao excluir: ' + error.message);
    else fetchProperties();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="admin-page-v3">
      <Navbar />
      
      <main className="admin-main">
        <header className="admin-dashboard-header">
          <div className="container">
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="header-content"
            >
              <div className="title-group">
                <h1>Painel <span className="gold-text">Elite</span></h1>
                <p>Gestão Profissional de Imóveis • Charles R. Nobre</p>
              </div>
              
              <div className="nav-tabs-premium">
                <button 
                  onClick={() => setActiveTab('properties')} 
                  className={`tab-premium ${activeTab === 'properties' ? 'active' : ''}`}
                >
                  <FileText size={18} /> Imóveis
                </button>
                <button 
                  onClick={() => setActiveTab('settings')} 
                  className={`tab-premium ${activeTab === 'settings' ? 'active' : ''}`}
                >
                  <Settings size={18} /> Configurações
                </button>
                <button onClick={handleLogout} className="btn-logout-premium">
                  <LogOut size={18} /> Sair
                </button>
              </div>
            </motion.div>
          </div>
        </header>

        <div className="container dashboard-grid">
          <AnimatePresence mode="wait">
            {activeTab === 'properties' ? (
              <motion.div 
                key="properties-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="split-view"
              >
                {/* FORMULÁRIO COLUNA 1 */}
                <section className="dashboard-card glass-card form-section">
                  <div className="card-header">
                    <Plus className="gold-icon" />
                    <h2>{editingId ? 'Editar Propriedade' : 'Novo Imóvel'}</h2>
                  </div>

                  <form onSubmit={handleSubmit} className="premium-form">
                    <div className="form-group-premium">
                      <label>Título do Anúncio</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="Ex: Mansão Exclusiva no Morro da Antena"
                      />
                    </div>

                    <div className="form-row-premium">
                      <div className="form-group-premium">
                        <label>Valor (R$)</label>
                        <div className="input-with-icon">
                          <DollarSign size={16} />
                          <input 
                            type="number" 
                            required 
                            value={formData.price}
                            onChange={(e) => setFormData({...formData, price: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="form-group-premium">
                        <label>Categoria</label>
                        <select 
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                        >
                          <option>Residencial</option>
                          <option>Alto Padrão</option>
                          <option>Terreno</option>
                          <option>Comercial</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group-premium">
                      <label>Galeria (Arraste para organizar)</label>
                      <div className="dropzone-premium" onClick={() => document.getElementById('multi-upload')?.click()}>
                        <div className="dropzone-content">
                          <UploadCloud size={32} className={uploading ? 'animate-bounce' : ''} />
                          <span>{uploading ? 'Enviando arquivos...' : 'Arraste fotos ou clique para subir'}</span>
                        </div>
                        <input 
                          id="multi-upload" 
                          type="file" 
                          multiple 
                          hidden 
                          onChange={handleMultiFileUpload}
                          accept="image/*"
                        />
                      </div>

                      <div className="reorder-gallery">
                        <Reorder.Group axis="x" values={formData.images} onReorder={reorderImages} className="image-sortable-grid">
                          {formData.images.map((img, index) => (
                            <Reorder.Item key={img} value={img} className="sortable-img-item" whileDrag={{ scale: 1.1 }}>
                              <img src={img} alt="" />
                              <button type="button" onClick={() => removeImage(index)} className="btn-del-img">
                                <Trash2 size={12} />
                              </button>
                              {index === 0 && <span className="badge-capa">CAPA</span>}
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                      </div>
                    </div>

                    <div className="form-row-premium">
                      <div className="form-group-premium">
                        <label>Cidade</label>
                        <select value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}>
                          <option>Imbituba</option>
                          <option>Garopaba</option>
                          <option>Imaruí</option>
                        </select>
                      </div>
                      <div className="form-group-premium">
                        <label>Bairro</label>
                        <input type="text" value={formData.neighborhood} onChange={(e) => setFormData({...formData, neighborhood: e.target.value})} />
                      </div>
                    </div>

                    <div className="form-group-premium">
                      <label>Descrição Detalhada</label>
                      <textarea 
                        rows="4"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                    </div>

                    <div className="form-actions-premium">
                      <button type="submit" className="btn-premium-gold" disabled={loading}>
                        {loading ? 'Sincronizando...' : (editingId ? 'Salvar Alterações' : 'Publicar Imóvel')}
                      </button>
                      {editingId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingId(null);
                            setFormData({ title: '', description: '', price: '', city: 'Imbituba', neighborhood: '', category: 'Residencial', images: [] });
                          }}
                          className="btn-premium-outline"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </section>

                {/* LISTA COLUNA 2 */}
                <section className="dashboard-card glass-card list-section">
                  <div className="card-header">
                    <Maximize2 size={20} className="gold-icon" />
                    <h2>Imóveis Ativos ({properties.length})</h2>
                  </div>
                  
                  <div className="property-feed-premium">
                    {loading && properties.length === 0 ? <div className="loading-state">Dourando conteúdos...</div> : (
                      properties.map(prop => (
                        <motion.div 
                          layout
                          key={prop.id} 
                          className="property-card-horizontal"
                        >
                          <div className="card-thumb">
                            <img src={prop.images?.[0] || '/images/property1.png'} alt="" />
                            <div className="category-tag">{prop.category}</div>
                          </div>
                          <div className="card-info-premium">
                            <h3>{prop.title}</h3>
                            <div className="info-meta">
                              <MapPin size={14} /> <span>{prop.neighborhood}, {prop.city}</span>
                            </div>
                            <div className="info-price">
                              R$ {prop.price?.toLocaleString('pt-BR')}
                            </div>
                            <div className="card-actions-premium">
                              <button onClick={() => handleEdit(prop)} className="btn-tool edit"><Edit3 size={16} /></button>
                              <button onClick={() => handleDelete(prop.id)} className="btn-tool del"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div 
                key="settings-tab"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="settings-grid-premium"
              >
                <div className="dashboard-card glass-card">
                  <h2>Institucional</h2>
                  <div className="premium-form">
                    <div className="form-group-premium">
                      <label>Bio (Texto de Apresentação)</label>
                      <textarea 
                        rows="12"
                        value={siteConfigs.about_bio}
                        onChange={(e) => setSiteConfigs({...siteConfigs, about_bio: e.target.value})}
                        onBlur={(e) => handleUpdateConfig('about_bio', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="dashboard-card glass-card">
                  <h2>Contatos e Links</h2>
                  <div className="premium-form">
                    <div className="form-group-premium">
                      <label>WhatsApp Oficial</label>
                      <input 
                        type="text"
                        value={siteConfigs.contact_phone}
                        onBlur={(e) => handleUpdateConfig('contact_phone', e.target.value)}
                        onChange={(e) => setSiteConfigs({...siteConfigs, contact_phone: e.target.value})}
                      />
                    </div>
                    <div className="form-group-premium">
                      <label>E-mail de Atendimento</label>
                      <input 
                        type="email"
                        value={siteConfigs.contact_email}
                        onBlur={(e) => handleUpdateConfig('contact_email', e.target.value)}
                        onChange={(e) => setSiteConfigs({...siteConfigs, contact_email: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .admin-page-v3 {
          background: #020617; /* Dark Slate */
          min-height: 100vh;
          color: #f8fafc;
          font-family: 'Inter', sans-serif;
        }

        .admin-dashboard-header {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 215, 0, 0.1);
          padding: 3rem 0;
          margin-bottom: 3rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .gold-text { color: #eab308; }
        .gold-icon { color: #eab308; }

        h1 { font-family: 'Playfair Display', serif; font-size: 2.5rem; margin: 0; }
        .title-group p { margin: 0.5rem 0 0; opacity: 0.6; font-size: 0.9rem; letter-spacing: 1px; }

        .nav-tabs-premium { display: flex; gap: 1rem; align-items: center; }

        .tab-premium {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 0.7rem 1.5rem;
          border-radius: 99px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.3s;
          font-weight: 500;
        }

        .tab-premium.active {
          background: linear-gradient(135deg, #eab308 0%, #a16207 100%);
          color: #020617;
          border-color: #eab308;
          box-shadow: 0 4px 15px rgba(234, 179, 8, 0.3);
        }

        .btn-logout-premium {
          background: transparent;
          color: #ef4444;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          margin-left: 1rem;
        }

        .dashboard-grid { padding-bottom: 5rem; }
        .split-view { display: grid; grid-template-columns: 1fr 1.5fr; gap: 3rem; }

        .glass-card {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }

        .card-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
        .card-header h2 { font-size: 1.4rem; margin: 0; font-family: 'Playfair Display', serif; }

        /* FORM STYLES */
        .form-group-premium { margin-bottom: 2rem; }
        .form-group-premium label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
        
        .form-group-premium input, 
        .form-group-premium select, 
        .form-group-premium textarea {
          width: 100%;
          background: rgba(2, 6, 23, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem;
          border-radius: 12px;
          color: white;
          transition: border-color 0.3s;
        }

        .form-group-premium input:focus { border-color: #eab308; outline: none; }

        .form-row-premium { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }

        .dropzone-premium {
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
        }
        .dropzone-premium:hover { border-color: #eab308; background: rgba(234, 179, 8, 0.05); }

        .dropzone-content { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; opacity: 0.6; }

        /* GALLERY REORDER */
        .image-sortable-grid { display: flex; gap: 0.8rem; overflow-x: auto; padding: 1rem 0; }
        .sortable-img-item {
          flex: 0 0 100px;
          height: 100px;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          cursor: grab;
          background: #000;
        }
        .sortable-img-item img { width: 100%; height: 100%; object-fit: cover; }
        .sortable-img-item:active { cursor: grabbing; }

        .btn-del-img { position: absolute; top: 5px; right: 5px; background: rgba(239, 68, 68, 0.8); border: none; color: white; padding: 4px; border-radius: 4px; cursor: pointer; }
        .badge-capa { position: absolute; bottom: 0; left: 0; right: 0; background: #eab308; color: #000; font-size: 10px; font-weight: 800; text-align: center; padding: 2px 0; }

        /* PROPERTY FEED */
        .property-feed-premium { display: flex; flex-direction: column; gap: 1.5rem; }
        .property-card-horizontal {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 15px;
          display: flex;
          overflow: hidden;
          transition: transform 0.3s, background 0.3s;
        }
        .property-card-horizontal:hover { transform: translateX(10px); background: rgba(255, 255, 255, 0.04); }

        .card-thumb { position: relative; width: 220px; flex-shrink: 0; }
        .card-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .category-tag { position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); color: #eab308; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 4px; }

        .card-info-premium { flex: 1; padding: 1.5rem; display: flex; flex-direction: column; justify-content: center; }
        .card-info-premium h3 { margin: 0 0 0.5rem; font-size: 1.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .info-meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.8rem; }
        .info-price { font-size: 1.3rem; font-weight: 700; color: #eab308; }

        .card-actions-premium { position: absolute; right: 1.5rem; top: 1.5rem; display: flex; gap: 0.5rem; }
        .btn-tool {
          width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; border: none; transition: all 0.3s;
        }
        .btn-tool.edit { background: rgba(56, 189, 248, 0.1); color: #38bdf8; }
        .btn-tool.del { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .btn-tool:hover { transform: scale(1.1); }

        .btn-premium-gold {
          background: linear-gradient(135deg, #eab308 0%, #a16207 100%);
          color: #020617;
          border: none;
          padding: 1.2rem;
          border-radius: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s;
          text-transform: uppercase;
        }
        .btn-premium-gold:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(234, 179, 8, 0.4); }

        .btn-premium-outline {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          padding: 1rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .settings-grid-premium { display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem; }

        @media (max-width: 1200px) {
          .split-view { grid-template-columns: 1fr; }
          .admin-dashboard-header .header-content { flex-direction: column; gap: 2rem; text-align: center; }
        }
      `}</style>
    </div>
  );
}
