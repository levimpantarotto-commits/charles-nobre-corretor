'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminLogin from '@/components/AdminLogin';

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('properties');
  const [siteConfigs, setSiteConfigs] = useState({
    hero_title: 'Sua Consultoria Imobiliária de',
    hero_title_accent: 'Elite no Litoral Sul',
    hero_subtitle: 'Curadoria exclusiva de imóveis em Imbituba, Garopaba e Imaruí.',
    about_title: 'Sobre Charles R. Nobre',
    about_creci: '37177',
    about_bio: '',
    contact_email: 'levimpantarotto@gmail.com',
    contact_phone: '(48) 99945-9527',
    instagram_link: '#',
    facebook_link: '#'
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
    const { data, error } = await supabase
      .from('site_configs')
      .select('*');
    
    if (error) {
      console.error('Error fetching configs:', error);
    } else if (data) {
      const configs = {};
      data.forEach(item => {
        configs[item.key] = item.value;
      });
      setSiteConfigs(prev => ({ ...prev, ...configs }));
    }
  }

  const handleUpdateConfig = async (key, value) => {
    const { error } = await supabase
      .from('site_configs')
      .upsert({ key, value }, { onConflict: 'key' });
    
    if (error) alert('Erro ao atualizar: ' + error.message);
    else fetchSiteConfigs();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
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
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, publicUrl]
      }));
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Se não houver imagens, usamos uma imagem padrão do Charles
    const finalImages = formData.images.length > 0 ? formData.images : ['/images/property1.png'];
    
    setLoading(true);
    const { error } = await supabase
      .from('properties')
      .insert([{
        ...formData,
        images: finalImages,
        price: parseFloat(formData.price)
      }]);

    if (error) alert('Erro ao salvar: ' + error.message);
    else {
      alert('Imóvel cadastrado com sucesso!');
      setFormData({ title: '', description: '', price: '', city: 'Imbituba', neighborhood: '', category: 'Residencial', images: [] });
      fetchProperties();
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

  if (!session) {
    return <AdminLogin onLogin={setSession} />;
  }

  return (
    <div className="admin-container">
      <Navbar />
      
      <main className="container section-padding">
        <div className="admin-header">
          <div className="header-top">
            <h1>Gestão do <span className="text-secondary">Portal</span></h1>
            <div className="admin-actions">
              <button 
                onClick={() => setActiveTab('properties')} 
                className={`tab-btn ${activeTab === 'properties' ? 'active' : ''}`}
              >
                Imóveis
              </button>
              <button 
                onClick={() => setActiveTab('settings')} 
                className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              >
                Configurações
              </button>
              <button onClick={handleLogout} className="btn-logout">Sair</button>
            </div>
          </div>
          <p>Gerencie imóveis e informações institucionais</p>
          {activeTab === 'properties' ? (
          <div className="admin-grid">
            <section className="admin-form-card">
              <h2>Cadastrar Novo Imóvel</h2>
              <form onSubmit={handleSubmit} className="admin-form">
                <div className="form-group">
                  <label>Título do Imóvel</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Mansão Vista Mar Praia do Rosa" 
                    required 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Preço (R$)</label>
                    <input 
                      type="number" 
                      placeholder="2500000" 
                      required 
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Categoria</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option>Residencial</option>
                      <option>Terreno</option>
                      <option>Comercial</option>
                      <option>Alto Padrão</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Cidade</label>
                    <select 
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                    >
                      <option>Imbituba</option>
                      <option>Garopaba</option>
                      <option>Imaruí</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bairro</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Praia do Rosa" 
                      required 
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                    />
                  </div>
                </div>

                {/* Seção de Imagem removida temporariamente conforme solicitado */}

                <div className="form-group">
                  <label>Descrição</label>
                  <textarea 
                    rows="4" 
                    placeholder="Descreva as características principais do imóvel..." 
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  ></textarea>
                </div>

                <button type="submit" className="btn-save" disabled={loading || uploading}>
                  {loading ? 'Processando...' : 'Cadastrar Imóvel'}
                </button>
              </form>
            </section>

            <section className="admin-list-card">
              <h2>Imóveis Ativos</h2>
              {loading && properties.length === 0 ? <p>Carregando...</p> : (
                <div className="admin-list">
                  {properties.map(prop => (
                    <div key={prop.id} className="admin-item">
                      <img src={prop.images?.[0] || '/images/property1.png'} alt="" />
                      <div className="item-info">
                        <h4>{prop.title}</h4>
                        <span>R$ {prop.price?.toLocaleString('pt-BR')}</span>
                      </div>
                      <button onClick={() => handleDelete(prop.id)} className="btn-delete">Excluir</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="admin-grid">
            <section className="admin-form-card">
              <h2>Informações da Página</h2>
              <div className="admin-form">
                <div className="form-group">
                  <label>Título Principal (Hero)</label>
                  <input 
                    type="text" 
                    value={siteConfigs.hero_title}
                    onChange={(e) => setSiteConfigs({...siteConfigs, hero_title: e.target.value})}
                    onBlur={(e) => handleUpdateConfig('hero_title', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Texto da Biografia (Sobre)</label>
                  <textarea 
                    rows="10" 
                    value={siteConfigs.about_bio}
                    onChange={(e) => setSiteConfigs({...siteConfigs, about_bio: e.target.value})}
                    onBlur={(e) => handleUpdateConfig('about_bio', e.target.value)}
                  ></textarea>
                </div>
              </div>
            </section>

            <section className="admin-form-card">
              <h2>Contato e Rodapé</h2>
              <div className="admin-form">
                <div className="form-group">
                  <label>E-mail de Contato</label>
                  <input 
                    type="email" 
                    value={siteConfigs.contact_email}
                    onChange={(e) => setSiteConfigs({...siteConfigs, contact_email: e.target.value})}
                    onBlur={(e) => handleUpdateConfig('contact_email', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Telefone/WhatsApp</label>
                  <input 
                    type="text" 
                    value={siteConfigs.contact_phone}
                    onChange={(e) => setSiteConfigs({...siteConfigs, contact_phone: e.target.value})}
                    onBlur={(e) => handleUpdateConfig('contact_phone', e.target.value)}
                  />
                </div>
                <p className="text-sm italic text-muted">As alterações são salvas automaticamente ao sair do campo.</p>
              </div>
            </section>
          </div>
        )}
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .admin-container {
          background: #f8fafc;
          min-height: 100vh;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .admin-header {
          margin-bottom: 4rem;
        }
        .admin-header h1 {
          font-size: 3rem;
          color: var(--primary);
          margin: 0;
        }
        .admin-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        .tab-btn {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .btn-logout {
          background: transparent;
          border: none;
          padding: 0.5rem 1rem;
          color: #ef4444;
          cursor: pointer;
          font-weight: 600;
        }
        .admin-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 3rem;
        }
        .admin-form-card, .admin-list-card {
          background: var(--white);
          padding: 2.5rem;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }
        h2 {
          font-size: 1.5rem;
          margin-bottom: 2rem;
          color: var(--primary);
          border-left: 4px solid var(--secondary);
          padding-left: 1rem;
        }
        .admin-form .form-group { margin-bottom: 1.5rem; }
        .admin-form label { display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; }
        .admin-form input, .admin-form select, .admin-form textarea {
          width: 100%; padding: 0.8rem; border: 1px solid #e2e8f0; border-radius: 6px;
        }
        .file-input-wrapper {
          position: relative;
          margin-bottom: 1rem;
        }
        #file-upload { display: none; }
        .btn-file {
          display: inline-block;
          background: #f1f5f9;
          padding: 0.8rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          color: var(--primary);
          border: 2px dashed #cbd5e1;
          width: 100%;
          text-align: center;
        }
        .image-previews {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .preview-thumb {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 4px;
        }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .btn-save {
          width: 100%; background: var(--secondary); color: var(--primary);
          padding: 1rem; border-radius: 6px; font-weight: 700; border: none; cursor: pointer;
        }
        .admin-list { display: flex; flex-direction: column; gap: 1rem; }
        .admin-item {
          display: flex; align-items: center; gap: 1rem; padding: 1rem;
          border: 1px solid #f1f5f9; border-radius: 8px;
        }
        .admin-item img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; }
        .item-info { flex: 1; }
        .item-info h4 { margin: 0; font-size: 1rem; }
        .item-info span { font-size: 0.85rem; color: var(--secondary); font-weight: 600; }
        .btn-delete {
          background: #fee2e2; color: #dc2626; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;
        }
        @media (max-width: 992px) { .admin-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
