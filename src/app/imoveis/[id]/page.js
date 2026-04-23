'use client';
import { useState, useEffect } from 'react';
import { useLead } from '@/context/LeadContext';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import listings from '@/data/listings.json';
import { IoChevronBack, IoChevronForward, IoClose, IoExpandOutline } from 'react-icons/io5';

export default function PropertyDetail() {
  const params = useParams();
  const { openLeadModal } = useLead();
  
  const property = listings.find(p => p.id === params.id);
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(!!property?.video);

  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isLightboxOpen]);

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

  const nextImage = (e) => {
    e?.stopPropagation();
    if (showVideo) {
      setShowVideo(false);
      setCurrentImageIndex(0);
    } else {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
    }
  };

  const prevImage = (e) => {
    e?.stopPropagation();
    if (showVideo) {
      setShowVideo(false);
      setCurrentImageIndex(property.images.length - 1);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
    }
  };

  const openLightbox = () => setIsLightboxOpen(true);
  const closeLightbox = () => setIsLightboxOpen(false);

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
              <div className="main-image-wrapper">
                {showVideo && property.video ? (
                  <video 
                    src={property.video} 
                    className="main-display-img" 
                    controls 
                    autoPlay 
                    muted 
                    loop 
                    playsInline
                  />
                ) : (
                  <img 
                    src={property.images[currentImageIndex]} 
                    alt={property.title} 
                    className="main-display-img"
                    onClick={openLightbox}
                  />
                )}
                
                {!showVideo && (
                  <div className="expand-hint" onClick={openLightbox}>
                    <IoExpandOutline /> Clique para ampliar
                  </div>
                )}

                {(property.images.length > 1 || property.video) && (
                  <div className="gallery-nav-overlay">
                    <button className="nav-btn-overlay prev" onClick={prevImage}><IoChevronBack /></button>
                    <button className="nav-btn-overlay next" onClick={nextImage}><IoChevronForward /></button>
                  </div>
                )}
              </div>
            </div>
            
            {(property.images.length > 1 || property.video) && (
              <div className="gallery-thumbs">
                {property.video && (
                  <div 
                    className={`thumb video-thumb ${showVideo ? 'active' : ''}`}
                    onClick={() => setShowVideo(true)}
                  >
                    <div className="video-icon-overlay">▶</div>
                    <video src={property.video} muted />
                  </div>
                )}
                {property.images.map((img, idx) => (
                  <div 
                    key={idx} 
                    className={`thumb ${(!showVideo && idx === currentImageIndex) ? 'active' : ''}`}
                    onClick={() => {
                      setShowVideo(false);
                      setCurrentImageIndex(idx);
                    }}
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

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox}><IoClose /></button>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={property.images[currentImageIndex]} alt="Property full view" className="lightbox-img" />
            
            {property.images.length > 1 && (
              <div className="lightbox-controls">
                <button className="l-btn prev" onClick={prevImage}><IoChevronBack /></button>
                <div className="counter">{currentImageIndex + 1} / {property.images.length}</div>
                <button className="l-btn next" onClick={nextImage}><IoChevronForward /></button>
              </div>
            )}
          </div>
        </div>
      )}

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
        .property-gallery { height: 600px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); position: relative; cursor: zoom-in; background: #eee; }
        .main-image-wrapper { width: 100%; height: 100%; position: relative; display: flex; align-items: center; justify-content: center; background: #000; }
        .main-display-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
        .property-gallery:hover .main-display-img { transform: scale(1.02); }

        .expand-hint { position: absolute; bottom: 1.5rem; right: 1.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.5rem 1rem; border-radius: 4px; font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; pointer-events: none; z-index: 5; }

        .gallery-nav-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 1rem; pointer-events: none; }
        .nav-btn-overlay { pointer-events: auto; background: rgba(255,255,255,0.2); color: white; border: none; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; cursor: pointer; transition: all 0.3s; backdrop-filter: blur(5px); }
        .nav-btn-overlay:hover { background: var(--secondary); color: var(--primary); }

        .gallery-thumbs { display: flex; gap: 0.75rem; margin-top: 1rem; overflow-x: auto; padding-bottom: 1rem; scrollbar-width: thin; }
        .thumb { width: 120px; height: 80px; background-size: cover; background-position: center; border-radius: 6px; cursor: pointer; opacity: 0.6; transition: all 0.3s; border: 3px solid transparent; flex-shrink: 0; }
        .thumb:hover { opacity: 0.9; }
        .thumb.active { opacity: 1; border-color: var(--secondary); transform: translateY(-3px); }

        .video-thumb { position: relative; overflow: hidden; background: #000; }
        .video-thumb video { width: 100%; height: 100%; object-fit: cover; opacity: 0.4; }
        .video-icon-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 1.5rem; z-index: 2; text-shadow: 0 0 10px rgba(0,0,0,0.5); }
        .video-thumb.active video { opacity: 0.8; }

        .property-grid-layout { display: grid; grid-template-columns: 1fr 380px; gap: 4rem; }
        .features-strip { display: flex; gap: 2rem; padding: 2rem; background: #f9f9f9; border-radius: 12px; margin-bottom: 3rem; flex-wrap: wrap; border: 1px solid #f0f0f0; }
        .feature { display: flex; flex-direction: column; }
        .feature strong { font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; }
        .feature span { font-weight: 600; color: var(--primary); font-size: 1.1rem; }

        .description h2 { font-family: 'Cinzel', serif; margin-bottom: 1.5rem; color: var(--primary); }
        .description p { line-height: 1.8; color: var(--text-muted); font-size: 1.1rem; white-space: pre-wrap; }

        .price-card { background: var(--primary); padding: 2.5rem; border-radius: 12px; color: var(--white); position: sticky; top: 120px; box-shadow: 0 15px 35px rgba(10, 20, 47, 0.2); }
        .price-card .label { font-size: 0.8rem; text-transform: uppercase; opacity: 0.7; letter-spacing: 2px; display: block; margin-bottom: 0.5rem; }
        .price-card .price { font-size: 2.2rem; font-family: 'Cinzel', serif; margin-bottom: 2rem; color: var(--secondary); }
        
        .btn-contact-full { width: 100%; background: var(--secondary); color: var(--primary); border: none; padding: 1.25rem; font-weight: 700; font-size: 0.9rem; letter-spacing: 2px; cursor: pointer; transition: var(--transition); border-radius: 4px; }
        .btn-contact-full:hover { background: var(--white); transform: translateY(-3px); box-shadow: 0 5px 15px rgba(212, 175, 55, 0.3); }

        .creci-box { margin-top: 2rem; padding: 1.5rem; border: 1px solid #eee; border-radius: 12px; text-align: center; color: var(--text-muted); font-size: 0.85rem; background: #fcfcfc; }

        /* Lightbox Styles */
        .lightbox-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
        .lightbox-close { position: absolute; top: 2rem; right: 2rem; background: none; border: none; color: white; font-size: 3rem; cursor: pointer; transition: color 0.3s; z-index: 10001; }
        .lightbox-close:hover { color: var(--secondary); }
        .lightbox-content { position: relative; max-width: 90vw; max-height: 85vh; display: flex; flex-direction: column; align-items: center; }
        .lightbox-img { max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 4px; box-shadow: 0 0 50px rgba(0,0,0,0.5); }
        
        .lightbox-controls { display: flex; align-items: center; gap: 2rem; margin-top: 2rem; color: white; }
        .l-btn { background: rgba(255,255,255,0.1); color: white; border: none; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; cursor: pointer; transition: all 0.3s; }
        .l-btn:hover { background: var(--secondary); color: var(--primary); }
        .counter { font-family: 'Cinzel', serif; font-size: 1.2rem; min-width: 80px; text-align: center; color: var(--secondary); }

        @media (max-width: 992px) {
          .property-grid-layout { grid-template-columns: 1fr; }
          .property-sidebar { position: static; }
          .price-card { position: static; }
          .property-gallery { height: 400px; }
          .property-header h1 { font-size: 2.2rem; }
          .location-row { flex-direction: column; align-items: flex-start; }
          .lightbox-controls { gap: 1rem; }
          .l-btn { width: 45px; height: 45px; font-size: 1.5rem; }
        }
      `}</style>
    </main>
  );
}
