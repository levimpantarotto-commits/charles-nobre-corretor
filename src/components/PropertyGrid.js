'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import useReveal from '@/hooks/useReveal';
import { MapPin, ArrowRight, Loader2, ImageIcon } from 'lucide-react';

// Função utilitária para garantir que a URL da imagem seja válida
const getValidImageUrl = (img) => {
  if (!img) return '/images/property1.png';
  if (img.startsWith('/images')) return img;
  if (img.startsWith('http')) return img;
  return '/images/property1.png';
};

export function PropertyCard({ id, image, title, location, price, type }) {
  const [revealRef, isVisible] = useReveal();
  const [imgSrc, setImgSrc] = useState(getValidImageUrl(image));
  
  const formattedPrice = typeof price === 'number' && price > 0
    ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Consulte o valor';

  return (
    <div 
      ref={revealRef} 
      className={`property-card-v4 reveal ${isVisible ? 'reveal-visible' : ''}`}
    >
      <div className="card-image-wrap">
        <img 
          src={imgSrc} 
          alt={title} 
          className="card-image" 
          loading="lazy" 
          onError={() => setImgSrc('/images/property1.png')}
        />
        <span className="card-category">{type}</span>
      </div>
      <div className="card-content">
        <p className="card-loc">
          <MapPin size={14} className="text-yellow-600" />
          {location}
        </p>
        <h3 className="card-title">{title}</h3>
        <div className="card-footer">
          <p className="card-price">{formattedPrice}</p>
          <Link href={`/imoveis/${id}`} className="btn-view-details">
            Detalhes <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <style jsx>{`
        .property-card-v4 { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); transition: 0.4s; border: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; height: 100%; }
        .property-card-v4:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .card-image-wrap { position: relative; height: 260px; overflow: hidden; background: #f1f5f9; }
        .card-image { width: 100%; height: 100%; object-fit: cover; transition: 0.6s; }
        .property-card-v4:hover .card-image { transform: scale(1.05); }
        .card-category { position: absolute; top: 1.2rem; right: 1.2rem; background: rgba(15, 23, 42, 0.9); color: #eab308; padding: 0.4rem 1rem; border-radius: 6px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; border: 1px solid #eab308; backdrop-filter: blur(4px); }
        .card-content { padding: 1.5rem; flex-grow: 1; display: flex; flex-direction: column; }
        .card-loc { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #64748b; margin-bottom: 0.8rem; font-weight: 600; }
        .card-title { font-size: 1.2rem; font-weight: 800; color: #0f172a; margin-bottom: 1.5rem; line-height: 1.3; height: 3.2rem; overflow: hidden; }
        .card-footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; padding-top: 1.2rem; border-top: 1px solid #f1f5f9; }
        .card-price { font-size: 1.15rem; font-weight: 900; color: #0f172a; }
        .btn-view-details { display: flex; align-items: center; gap: 0.5rem; color: #0f172a; font-weight: 800; font-size: 0.9rem; text-decoration: none; border: 2px solid #0f172a; padding: 0.5rem 1rem; border-radius: 8px; transition: 0.3s; }
        .btn-view-details:hover { background: #0f172a; color: #fff; }
      `}</style>
    </div>
  );
}

export default function PropertyGrid() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchProperties() {
      try {
        // Agora buscamos da nossa API interna que lê o listings.json
        const res = await fetch('/api/properties');
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        if (isMounted) setList(data || []);
      } catch (err) {
        console.error('Fetch Error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    fetchProperties();
    return () => { isMounted = false; };
  }, []);

  if (loading) return (
    <div className="loading-container-v4">
      <div className="loading-content">
        <Loader2 className="animate-spin text-yellow-500 mb-4" size={48} />
        <p>Acessando banco de dados local...</p>
      </div>
      <style jsx>{`
        .loading-container-v4 { display: flex; align-items: center; justify-content: center; padding: 10rem 0; background: #fff; }
        .loading-content { display: flex; flex-direction: column; align-items: center; color: #0f172a; font-weight: 800; letter-spacing: -0.5px; }
      `}</style>
    </div>
  );

  return (
    <section id="properties" className="section-padding property-section-v4">
      <div className="container">
        <div className="section-header-v4">
          <h2 className="section-title">Imóveis <span className="text-accent underline-yellow">Destaque</span></h2>
          <p className="section-subtitle">Acesso direto ao portfólio oficial Charles R. Nobre. Exclusividade e transparência.</p>
        </div>
        
        {list.length > 0 ? (
          <div className="property-grid-v4">
            {list.map((prop) => (
              <PropertyCard 
                key={prop.id} 
                id={prop.id}
                image={prop.images?.[0]}
                title={prop.title}
                location={`${prop.neighborhood || prop.location?.neighborhood || 'Centro'}, ${prop.city || prop.location?.city || 'Imbituba'}`}
                price={prop.price}
                type={prop.category || prop.type}
              />
            ))}
          </div>
        ) : (
          <div className="empty-portfolio-v4">
            <ImageIcon size={48} className="mb-4 opacity-20" />
            <p>Nenhum imóvel disponível para exibição no momento.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .property-section-v4 { background: #f8fafc; }
        .section-header-v4 { text-align: center; margin-bottom: 5rem; }
        .section-title { font-size: 3.2rem; font-weight: 900; color: #1e293b; margin-bottom: 1.2rem; font-family: 'Playfair Display', serif; }
        .underline-yellow { text-decoration: underline; text-decoration-color: #eab308; text-underline-offset: 8px; }
        .section-subtitle { color: #475569; max-width: 650px; margin: 0 auto; font-size: 1.15rem; line-height: 1.6; }
        .property-grid-v4 { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 3.5rem; }
        .empty-portfolio-v4 { text-align: center; padding: 6rem; color: #94a3b8; border: 2px dashed #e2e8f0; border-radius: 20px; display: flex; flex-direction: column; align-items: center; }
      `}</style>
    </section>
  );
}
