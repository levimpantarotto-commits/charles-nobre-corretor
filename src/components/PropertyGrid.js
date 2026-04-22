'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import useReveal from '@/hooks/useReveal';
import listings from '@/data/listings.json';

export function PropertyCard({ id, image, title, location, price, type }) {
  const [revealRef, isVisible] = useReveal();
  
  // Format price if it's a number
  const formattedPrice = typeof price === 'number' && price > 0
    ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Consulte o valor';

  return (
    <div 
      ref={revealRef} 
      className={`card reveal ${isVisible ? 'reveal-visible' : ''}`}
    >
      <div className="card-image-wrap">
        <img src={image} alt={title} className="card-image" />
        <span className="card-type">{type}</span>
      </div>
      <div className="card-info">
        <p className="card-location">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          {location}
        </p>
        <h3 className="card-title">{title}</h3>
        <p className="card-price">{formattedPrice}</p>
        <Link href={`/imoveis/${id}`} className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>Ver Detalhes</Link>
      </div>

      <style jsx>{`
        .card {
          background: var(--white);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: var(--shadow);
          transition: var(--transition);
          border: 1px solid rgba(0,0,0,0.05);
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.2);
        }

        .card-image-wrap {
          position: relative;
          height: 250px;
          overflow: hidden;
        }

        .card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: var(--transition);
        }

        .card:hover .card-image {
          transform: scale(1.1);
        }

        .card-type {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: var(--primary);
          color: var(--white);
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .card-info {
          padding: 1.5rem;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
        }

        .card-location {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }

        .card-title {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
          color: var(--primary);
          line-height: 1.2;
        }

        .card-price {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--secondary);
          margin-bottom: 1.5rem;
          margin-top: auto;
        }
      `}</style>
    </div>
  );
}

export default function PropertyGrid() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For now, we use the local JSON which is easier for the user to update
    setList(listings);
    setLoading(false);
  }, []);


  if (loading) return (
    <div className="loading-state">
      <p>Carregando imóveis selecionados...</p>
      <style jsx>{`
        .loading-state { text-align: center; padding: 5rem; color: var(--text-muted); }
      `}</style>
    </div>
  );

  return (
    <section id="properties" className="section-padding">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Imóveis <span className="text-accent">Destaque</span></h2>
          <p className="section-subtitle">A curadoria definitiva para quem busca o melhor do litoral sul catarinense.</p>
        </div>
        <div className="grid">
          {list.map((prop) => (
            <PropertyCard 
              key={prop.id} 
              id={prop.id}
              image={prop.images?.[0] || '/images/property1.png'}
              title={prop.title}
              location={`${prop.neighborhood || prop.location?.neighborhood}, ${prop.city || prop.location?.city}`}
              price={prop.price}
              type={prop.category || prop.type}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .section-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .section-title {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          color: var(--primary);
        }

        .section-subtitle {
          color: var(--text-muted);
          max-width: 600px;
          margin: 0 auto;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2.5rem;
        }

        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
