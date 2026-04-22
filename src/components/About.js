'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import useReveal from '@/hooks/useReveal';

export default function About() {
  const [imgRef, imgVisible] = useReveal();
  const [contentRef, contentVisible] = useReveal();
  const [aboutData, setAboutData] = useState({
    bio: `Sou corretor de imóveis com uma visão que vai além da simples negociação — meu trabalho é conectar pessoas a espaços que fazem sentido para suas vidas.\n\nMinha trajetória inclui experiências internacionais que ampliaram meu olhar sobre arquitetura, estilo de vida e valorização imobiliária. Lugares onde a integração entre natureza, design e bem-estar não é tendência, mas essência. Essa vivência me trouxe repertório, sensibilidade estética e uma compreensão mais profunda do que realmente torna um imóvel especial.\n\nAo mesmo tempo, tenho um conhecimento enraizado na região de Imbituba e arredores — conheço cada detalhe que não aparece nos mapas: os melhores pontos de pôr do sol, as áreas com maior potencial de valorização, a dinâmica das praias, do vento, do turismo e da cultura local.\n\nMeu diferencial está justamente nessa combinação: visão global com atuação local. Consigo enxergar oportunidades com um olhar estratégico, mas também sensorial — aquele que entende o valor de uma casa com vista para o mar, de uma cabana integrada à natureza ou de um terreno com energia única.\n\nTrabalho de forma personalizada, com atenção aos detalhes e foco em criar conexões reais entre pessoas e propriedades. Mais do que vender imóveis, facilito escolhas que impactam estilo de vida, investimento e bem-estar.\n\nSe você busca mais do que um imóvel — busca um lugar com significado — estou aqui para te guiar.`,
    creci: '37177'
  });

  useEffect(() => {
    async function fetchAbout() {
      const { data } = await supabase.from('site_configs').select('key, value');
      if (data) {
        const bio = data.find(c => c.key === 'about_bio')?.value;
        const creci = data.find(c => c.key === 'about_creci')?.value;
        if (bio) setAboutData(prev => ({ ...prev, bio }));
        if (creci) setAboutData(prev => ({ ...prev, creci }));
      }
    }
    fetchAbout();
  }, []);

  return (
    <section id="about" className="section-padding about-section">
      <div className="container about-grid">
        <div 
          ref={imgRef}
          className={`about-image-wrap reveal ${imgVisible ? 'reveal-visible' : ''}`}
        >
          <div className="about-image-bg"></div>
          <img src="/images/charles-no-bg.png" alt="Charles R. Nobre" className="about-image" />
        </div>
        <div 
          ref={contentRef}
          className={`about-content reveal ${contentVisible ? 'reveal-visible' : ''}`}
        >
          <span className="about-tag">Seu Parceiro de Negócios</span>
          <h2 className="about-title">Sobre <span className="text-accent">Charles R. Nobre</span></h2>
          <span className="creci-badge">CRECI: {aboutData.creci}</span>
          <div className="about-text-container">
            {aboutData.bio.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="about-text">{paragraph}</p>
            ))}
          </div>
          <div className="about-stats">
            <div className="stat-item">
              <span className="stat-number">15+</span>
              <span className="stat-label">Anos de Experiência</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">500+</span>
              <span className="stat-label">Clientes Satisfeitos</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .about-section {
          background: var(--white);
        }

        .about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5rem;
          align-items: center;
        }

        .about-image-wrap {
          position: relative;
          padding: 2rem;
          background: #fdfcfb;
          border: 1px solid #e5e7eb;
          box-shadow: 20px 20px 60px #d1d9e6, -20px -20px 60px #ffffff;
          border-radius: 2px;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          overflow: hidden;
        }

        .about-image-bg {
          position: absolute;
          inset: 0.5rem;
          border: 1px solid var(--secondary);
          opacity: 0.3;
          pointer-events: none;
        }

        .about-image {
          position: relative;
          z-index: 2;
          width: 110%;
          height: auto;
          max-height: 550px;
          object-fit: cover;
          object-position: top center;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .about-image:hover {
          transform: scale(1.03);
        }

        .about-tag {
          color: var(--secondary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-size: 0.8rem;
          display: block;
          margin-bottom: 1rem;
        }

        .about-title {
          font-size: 3rem;
          margin-bottom: 0.5rem;
          color: var(--primary);
        }

        .creci-badge {
          display: inline-block;
          background: rgba(197, 160, 89, 0.1);
          color: var(--secondary);
          padding: 0.4rem 1rem;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 2rem;
        }

        .about-text {
          font-size: 1.1rem;
          color: var(--text-muted);
          margin-bottom: 1.5rem;
        }

        .about-stats {
          display: flex;
          gap: 3rem;
          margin-top: 3rem;
        }

        .stat-number {
          display: block;
          font-family: 'Playfair Display', serif;
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--primary);
        }

        .stat-label {
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        @media (max-width: 992px) {
          .about-grid {
            grid-template-columns: 1fr;
            gap: 4rem;
          }
          .about-image-bg {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
