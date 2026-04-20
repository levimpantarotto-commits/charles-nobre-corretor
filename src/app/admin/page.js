'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AdminPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    city: 'Imbituba',
    neighborhood: '',
    category: 'Residencial',
    images: []
  });
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    fetchProperties();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('properties')
      .insert([{
        ...formData,
        price: parseFloat(formData.price),
        images: [imageUrl || '/images/property1.png']
      }]);

    if (error) alert('Erro ao salvar: ' + error.message);
    else {
      alert('Imóvel cadastrado com sucesso!');
      setFormData({ title: '', description: '', price: '', city: 'Imbituba', neighborhood: '', category: 'Residencial', images: [] });
      setImageUrl('');
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

  return (
    <div className="admin-container">
      <Navbar />
      
      <main className="container section-padding">
        <div className="admin-header">
          <h1>Gestão de <span className="text-secondary">Imóveis</span></h1>
          <p>Painel exclusivo do Consultor Charles R. Nobre</p>
        </div>

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

              <div className="form-group">
                <label>URL da Imagem (Principal)</label>
                <input 
                  type="text" 
                  placeholder="Cole o link da imagem aqui" 
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>

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

              <button type="submit" className="btn-save" disabled={loading}>
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
      </main>

      <Footer />

      <style jsx>{`
        .admin-container {
          background: #f8fafc;
          min-height: 100vh;
        }
        .admin-header {
          text-align: center;
          margin-bottom: 4rem;
        }
        .admin-header h1 {
          font-size: 3rem;
          color: var(--primary);
        }
        .admin-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
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
        .admin-form input, .admin-form select, .admin-form textview, .admin-form textarea {
          width: 100%; padding: 0.8rem; border: 1px solid #e2e8f0; border-radius: 6px;
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
