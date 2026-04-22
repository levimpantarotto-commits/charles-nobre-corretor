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
  const [setupError, setSetupError] = useState(false);
  const [siteConfigs, setSiteConfigs] = useState({
    about_bio: `Sou corretor de imóveis com uma visão que vai além da simples negociação — meu trabalho é conectar pessoas a espaços que fazem sentido para suas vidas.

Minha trajetória inclui experiências internacionais que ampliaram meu olhar sobre arquitetura, estilo de vida e valorização imobiliária. Lugares onde a integração entre natureza, design e bem-estar não é tendência, mas essência. Essa vivência me trouxe repertório, sensibilidade estética e uma compreensão mais profunda do que realmente torna um imóvel especial.

Ao mesmo tempo, tenho um conhecimento enraizado na região de Imbituba e arredores — conheço cada detalhe que não aparece nos mapas: os melhores pontos de pôr do sol, as áreas com maior potencial de valorização, a dinâmica das praias, do vento, do turismo e da cultura local.

Meu diferencial está justamente nessa combinação: visão global com atuação local. Ofereço uma curadoria criteriosa, focada em quem busca não apenas um endereço, mas um investimento em qualidade de vida.

Se você procura transparência, repertório e um parceiro para encontrar o seu lugar no paraíso, vamos conversar.`,
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
    if (error) {
      console.error('Error fetching configs:', error);
      if (error.message.includes('relation "site_configs" does not exist')) setSetupError(true);
    } else if (data) {
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

  if (!session) return <AdminLogin />;

  return (
    <div className="admin-page-v3">
      <main className="admin-main">
        <header className="admin-dashboard-header">
          <div className="container header-container-clean">
            <div className="admin-branding-clean">
              <img src="/images/logo-trimmed.png" alt="Charles R. Nobre" className="admin-logo-img" />
              <div className="branding-text">
                <h1>Painel <span className="gold-text">Administrativo</span></h1>
                <p>Gestão de Imóveis • Charles R. Nobre</p>
              </div>
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
          </div>
          
          {setupError && (
            <div className="container" style={{ marginTop: '1rem' }}>
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="setup-alert-bar"
              >
                <AlertCircle size={20} />
                <span>Atenção: Banco de dados não configurado. Execute o SQL no Supabase para ativar a Bio e Contatos!</span>
              </motion.div>
            </div>
          )}
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
                    <Plus className="gold-icon" size={24} />
                    <h2>{editingId ? '🛠️ Editando Imóvel' : '➕ Novo Imóvel'}</h2>
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
                        <div className="input-with-icon-wrap">
                          <DollarSign size={16} className="input-icon" />
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
                      <label>Galeria (Clique abaixo para subir)</label>
                      <div className="dropzone-premium" onClick={() => document.getElementById('multi-upload')?.click()}>
                        <div className="dropzone-content">
                          <UploadCloud size={32} className={uploading ? 'animate-bounce' : ''} />
                          <span>{uploading ? 'Enviando arquivos...' : 'Clique para subir fotos'}</span>
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
                        {loading ? 'Salvando...' : (editingId ? '💾 Atualizar Imóvel' : '🚀 Publicar Agora')}
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
                    <CheckCircle size={24} className="gold-icon" />
                    <h2>Imóveis Ativos ({properties.length})</h2>
                  </div>
                  
                  <div className="property-feed-premium">
                    {loading && properties.length === 0 ? <div className="loading-state">Carregando lista...</div> : (
                      properties.map(prop => (
                        <motion.div 
                          layout
                          key={prop.id} 
                          className="property-card-horizontal"
                        >
                          <div className="card-thumb">
                            <img 
                              src={prop.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1000&auto=format&fit=crop'} 
                              alt="" 
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1000&auto=format&fit=crop';
                              }}
                            />
                            <div className="category-tag">{prop.category}</div>
                          </div>
                          <div className="card-info-premium">
                            <h3 style={{ color: '#ffffff', opacity: 1, textShadow: 'none' }}>{prop.title}</h3>
                            <div className="info-meta" style={{ color: '#cbd5e1' }}>
                              <MapPin size={14} /> <span>{prop.neighborhood}, {prop.city}</span>
                            </div>
                            <div className="info-price">
                              R$ {prop.price?.toLocaleString('pt-BR')}
                            </div>
                            <div className="card-actions-row">
                              <button onClick={() => handleEdit(prop)} className="btn-action edit">
                                <Edit3 size={16} /> <span>Editar</span>
                              </button>
                              <button onClick={() => handleDelete(prop.id)} className="btn-action del">
                                <Trash2 size={16} /> <span>Excluir</span>
                              </button>
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
                  <div className="card-header">
                    <FileText className="gold-icon" size={24} />
                    <h2>Institucional</h2>
                  </div>
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
                  <div className="card-header">
                    <Settings className="gold-icon" size={24} />
                    <h2>Contatos e Links</h2>
                  </div>
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
          background: #020617; 
          min-height: 100vh;
          color: #f8fafc;
          font-family: 'Inter', sans-serif;
        }

        .admin-dashboard-header {
          background: #0f172a;
          border-bottom: 2px solid #eab308;
          padding: 1.2rem 0;
          margin-bottom: 2.5rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-container-clean {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .admin-branding-clean {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .admin-logo-img {
          height: 55px;
          filter: brightness(1.1);
        }

        .branding-text h1 { 
          font-family: 'Playfair Display', serif; 
          font-size: 1.6rem; 
          margin: 0; 
          color: #ffffff;
        }
        
        .branding-text p { 
          margin: 0; 
          opacity: 1 !important; 
          font-size: 0.8rem; 
          color: #eab308;
          text-transform: uppercase;
          font-weight: 800;
        }

        .gold-text { color: #eab308; }
        .gold-icon { color: #eab308; }

        .nav-tabs-premium { display: flex; gap: 0.8rem; align-items: center; }

        .tab-premium {
          background: #1e293b;
          border: 1px solid #475569;
          padding: 0.7rem 1.4rem;
          border-radius: 8px;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          cursor: pointer;
          transition: all 0.3s;
          font-weight: 700;
        }

        .tab-premium.active {
          background: #eab308;
          color: #020617;
          border-color: #eab308;
        }

        .btn-logout-premium {
          background: #ef4444;
          color: #ffffff;
          border: none;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          margin-left: 1rem;
        }

        .dashboard-grid { padding-bottom: 5rem; }
        .split-view { display: grid; grid-template-columns: 1fr 1.6fr; gap: 2.5rem; }

        .glass-card {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 2rem;
        }

        .card-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #334155; padding-bottom: 1rem; }
        .card-header h2 { font-size: 1.4rem; margin: 0; color: #ffffff; font-weight: 800; }

        .form-group-premium { margin-bottom: 1.5rem; }
        .form-group-premium label { 
          display: block; 
          font-size: 0.85rem; 
          font-weight: 900; 
          margin-bottom: 0.6rem; 
          color: #ffffff; 
          text-transform: uppercase; 
        }
        
        .form-group-premium input, 
        .form-group-premium select, 
        .form-group-premium textarea {
          width: 100%;
          background: #1e293b;
          border: 1px solid #475569;
          padding: 1rem;
          border-radius: 8px;
          color: #ffffff;
          font-size: 1rem;
        }

        .input-with-icon-wrap { position: relative; }
        .input-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #eab308; }
        .input-with-icon-wrap input { padding-left: 2.8rem; }

        .form-row-premium { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

        .dropzone-premium {
          border: 2px dashed #475569;
          border-radius: 8px;
          padding: 2.5rem;
          text-align: center;
          cursor: pointer;
          background: #1e293b;
        }

        .property-feed-premium { display: flex; flex-direction: column; gap: 1.5rem; }
        .property-card-horizontal {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          display: flex;
          overflow: hidden;
        }

        .card-thumb { width: 240px; height: 180px; flex-shrink: 0; }
        .card-thumb img { width: 100%; height: 100%; object-fit: cover; }

        .card-info-premium { flex: 1; padding: 1.5rem; display: flex; flex-direction: column; }
        .info-price { font-size: 1.8rem; font-weight: 900; color: #eab308; margin-top: 0.5rem; }

        .card-actions-row { display: flex; gap: 1rem; margin-top: 1.5rem; }
        .btn-action {
          flex: 1; padding: 1rem; border-radius: 8px; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          font-weight: 900; text-transform: uppercase;
        }
        .btn-action.edit { background: #0284c7; color: #ffffff; }
        .btn-action.del { background: #dc2626; color: #ffffff; }

        .btn-premium-gold {
          background: #eab308; color: #000; padding: 1.2rem; border-radius: 8px; font-weight: 900; cursor: pointer; text-transform: uppercase;
        }
        
        .image-sortable-grid { display: flex; gap: 1rem; overflow-x: auto; padding: 1.5rem 0; }
        .sortable-img-item { flex: 0 0 120px; height: 120px; border-radius: 8px; overflow: hidden; position: relative; }
        .sortable-img-item img { width: 100%; height: 100%; object-fit: cover; }
        .btn-del-img { position: absolute; top: 5px; right: 5px; background: #ef4444; border: none; color: white; padding: 4px; border-radius: 4px; cursor: pointer; }
        .badge-capa { position: absolute; bottom: 0; left: 0; right: 0; background: #eab308; color: #000; font-size: 10px; font-weight: 900; text-align: center; }
        .setup-alert-bar { background: #7f1d1d; color: #fecaca; padding: 1rem; border-radius: 8px; display: flex; align-items: center; gap: 1rem; }
        .btn-premium-outline { background: transparent; border: 1px solid #475569; color: #ffffff; padding: 1rem; border-radius: 8px; cursor: pointer; }
        .settings-grid-premium { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
      `}</style>
    </div>
  );
}
