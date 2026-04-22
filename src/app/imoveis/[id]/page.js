'use client';
import { useState } from 'react';
import { useLead } from '@/context/LeadContext';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import listings from '@/data/listings.json';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

export default function PropertyDetail() {
  const params = useParams();
  const { openLeadModal } = useLead();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const property = listings.find(p => p.id === params.id);

  if (!property) {
    return (
      <main>
        <Navbar />
        <div className="container section-padding" style={{ paddingTop: '12rem', textAlign: 'center' }}>
          <h1>Imóvel não encontrado</h1>
          <p>O imóvel solicitado não existe ou foi removido.</p>
        </div>
        <Footer />
      </main>
    );
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  const formattedPrice = property.price > 0 
    ? `R$ ${property.price.toLocaleString('pt-BR')}`
    : 'Consulte o valor';

  return (
    <main className="property-page">
      <Navbar />
      
      <section className="property-hero section-padding">
        <div className="container">
          <div className="property-header">
            <span className="badge">{property.type}</span>
            <h1>{property.title}</h1>
            <div className="location-row">
              <p className="location">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                {property.location.neighborhood}, {property.location.city} - {property.location.state}
              </p>
              <div className="region-tag">Especialista em {property.location.city}</div>
            </div>
          </div>

          <div className="property-gallery-container">
            <div className="property-gallery">
              <div className="main-image" style={{ backgroundImage: `url(${property.images[currentImageIndex]})` }}>
                {property.images.length > 1 && (
                  <>
                    <button className="nav-btn prev" onClick={prevImage}><IoChevronBack /></button>
                    <button className="nav-btn next" onClick={nextImage}><IoChevronForward /></button>
                  </>
                )}
              </div>
            </div>
            {property.images.length > 1 && (
              <div className="gallery-thumbs">
                {property.images.map((img, idx) => (
                  <div 
                    key={idx} 
                    className={`thumb ${idx === currentImageIndex ? 'active' : ''}`}
                    onClick={() => setCurrentImageIndex(idx)}
                    style={{ backgroundImage: `url(${img})` }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="property-grid-layout">
            <div className="property-main">
              <div className="features-strip">
                <div className="feature">
                  <strong>Área</strong>
                  <span>{property.area} m²</span>
                </div>
                {property.features.map(f => (
                  <div key={f} className="feature">
                    <strong>Destaque</strong>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="description">
                <h2>Sobre este imóvel</h2>
                <p>{property.description}</p>
              </div>
            </div>

            <aside className="property-sidebar">
              <div className="price-card">
                <span className="label">Valor de Investimento</span>
                <h2 className="price">{formattedPrice}</h2>
                <button onClick={() => openLeadModal(property.title)} className="btn-contact-full">
                  TENHO INTERESSE
                </button>
              </div>
              <div className="creci-box">
                Charles R. Nobre <br /> 
                <strong>CRECI: 37177</strong>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />

      <style jsx>{`
        .property-page { background: #fff; min-height: 100vh; }
        .property-hero { padding-top: 10rem; }
        .badge { background: var(--secondary); color: var(--primary); padding: 0.4rem 1rem; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 1rem; display: inline-block; }
        .property-header h1 { font-family: 'Cinzel', serif; font-size: 3rem; color: var(--primary); margin-bottom: 0.5rem; }
        .location-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2.5rem; flex-wrap: wrap; gap: 1rem; }
        .location { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 1.1rem; margin: 0; }
        .region-tag { background: #f0f7ff; color: #0056b3; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; border: 1px solid #cce5ff; }
        
        .property-gallery-container { margin-bottom: 3rem; }
        .property-gallery { height: 600px; border-radius: 8px; overflow: hidden; box-shadow: var(--shadow); position: relative; }
        .main-image { width: 100%; height: 100%; background-size: cover; background-position: center; transition: background-image 0.3s ease-in-out; display: flex; align-items: center; justify-content: space-between; }
        
        .nav-btn { background: rgba(0,0,0,0.4); color: white; border: none; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; cursor: pointer; transition: background 0.3s; pointer-events: auto; z-index: 10; }
        .nav-btn:hover { background: var(--secondary); color: var(--primary); }
        .prev { border-radius: 0 4px 4px 0; }
        .next { border-radius: 4px 0 0 4px; }

        .gallery-thumbs { display: flex; gap: 1rem; margin-top: 1rem; overflow-x: auto; padding-bottom: 0.5rem; }
        .thumb { width: 120px; height: 80px; background-size: cover; background-position: center; border-radius: 4px; cursor: pointer; opacity: 0.6; transition: all 0.3s; border: 2px solid transparent; flex-shrink: 0; }
        .thumb:hover { opacity: 0.9; }
        .thumb.active { opacity: 1; border-color: var(--secondary); transform: scale(1.05); }

        .property-grid-layout { display: grid; grid-template-columns: 1fr 380px; gap: 4rem; }
        
        .features-strip { display: flex; gap: 2rem; padding: 2rem; background: #f9f9f9; border-radius: 8px; margin-bottom: 3rem; flex-wrap: wrap; }
        .feature { display: flex; flex-direction: column; }
        .feature strong { font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; }
        .feature span { font-weight: 600; color: var(--primary); font-size: 1.1rem; }

        .description h2 { font-family: 'Cinzel', serif; margin-bottom: 1.5rem; color: var(--primary); }
        .description p { line-height: 1.8; color: var(--text-muted); font-size: 1.1rem; white-space: pre-wrap; }

        .price-card { background: var(--primary); padding: 2.5rem; border-radius: 8px; color: var(--white); position: sticky; top: 120px; }
        .price-card .label { font-size: 0.8rem; text-transform: uppercase; opacity: 0.7; letter-spacing: 2px; display: block; margin-bottom: 0.5rem; }
        .price-card .price { font-size: 2.2rem; font-family: 'Cinzel', serif; margin-bottom: 2rem; color: var(--secondary); }
        
        .btn-contact-full { width: 100%; background: var(--secondary); color: var(--primary); border: none; padding: 1.25rem; font-weight: 700; font-size: 0.9rem; letter-spacing: 2px; cursor: pointer; transition: var(--transition); }
        .btn-contact-full:hover { background: var(--white); transform: translateY(-3px); }

        .creci-box { margin-top: 2rem; padding: 1.5rem; border: 1px solid #eee; border-radius: 8px; text-align: center; color: var(--text-muted); font-size: 0.85rem; }

        @media (max-width: 992px) {
          .property-grid-layout { grid-template-columns: 1fr; }
          .property-sidebar { position: static; }
          .price-card { position: static; }
          .property-gallery { height: 400px; }
          .property-header h1 { font-size: 2rem; }
          .location-row { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </main>
  );
}
