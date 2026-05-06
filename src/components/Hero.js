'use client';
import { useState, useEffect } from 'react';
import useReveal from '@/hooks/useReveal';
import { useLead } from '@/context/LeadContext';
import SearchBar from './SearchBar';

export default function Hero() {
  const { openLeadModal } = useLead();
  const [revealRef, isVisible] = useReveal();
  const [heroData, setHeroData] = useState({
    title: 'Realizando sonhos no litoral de Santa Catarina',
    subtitle: 'Especialista em propriedades exclusivas em Imbituba, Garopaba e Imaruí. Consultoria personalizada para o seu melhor investimento.'
  });

  useEffect(() => {
    async function fetchHero() {
      try {
        const res = await fetch('/api/configs');
        const data = await res.json();
        if (data) {
          if (data.hero_title) setHeroData(prev => ({ ...prev, title: data.hero_title }));
          if (data.hero_subtitle) setHeroData(prev => ({ ...prev, subtitle: data.hero_subtitle }));
        }
      } catch (err) {
        console.error('Falha ao carregar Hero local');
      }
    }
    fetchHero();
  }, []);

  return (
    <section className="hero">
      <div className="hero-video-wrap">
        <video 
          autoPlay 
          muted 
          loop 
          playsInline 
          className="hero-video"
          poster="/images/hero-rosa.png"
        >
          <source src="/videos/site-video.mp4" type="video/mp4" />
        </video>
        <div className="hero-video-overlay"></div>
      </div>
      
      <div className="hero-top-overlay"></div>
      <div className="hero-overlay"></div>
      
      <div 
        ref={revealRef} 
        className={`container hero-content reveal ${isVisible ? 'reveal-visible' : ''}`}
      >
        <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: heroData.title.replace('litoral', '<br /><span className="text-accent">litoral') }}>
        </h1>
        <p className="hero-subtitle">
          {heroData.subtitle}
        </p>
        <div className="hero-search-wrap">
          <SearchBar />
        </div>

        <div className="hero-actions">
          <button onClick={() => openLeadModal()} className="btn-secondary-white">Falar com Charles</button>
        </div>
      </div>

      <style jsx>{`
        .hero {
          position: relative;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--white);
          overflow: hidden;
        }

        .hero-video-wrap {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .hero-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .hero-video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.3);
          z-index: 1;
        }

        .hero-top-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 300px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%);
          z-index: 2;
        }

        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to bottom,
            rgba(10, 25, 47, 0.2),
            rgba(10, 25, 47, 0.6)
          );
          z-index: 2;
        }

        .hero-content {
          position: relative;
          z-index: 3;
          text-align: center;
          max-width: 900px;
          padding-top: clamp(8rem, 20vw, 12rem); /* Increased for luxury header clearance */
        }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: 4.5rem;
          line-height: 1.1;
          margin-bottom: 2rem;
          font-weight: 700;
          color: var(--white); /* Switching to white for contrast */
          text-shadow: 0 2px 20px rgba(0,0,0,0.5); /* Shadow for readability */
        }

        .hero-subtitle {
          font-size: 1.25rem;
          margin-bottom: 3rem;
          opacity: 0.9;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-search-wrap {
          margin-top: 3rem;
          margin-bottom: 2rem;
          width: 100%;
        }

        .hero-actions {
          display: flex;
          gap: 1.5rem;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.2rem;
            margin-top: 2rem;
          }
          .hero-actions {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>
    </section>
  );
}
