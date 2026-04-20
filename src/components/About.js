import useReveal from '@/hooks/useReveal';

export default function About() {
  const [imgRef, imgVisible] = useReveal();
  const [contentRef, contentVisible] = useReveal();

  return (
    <section id="about" className="section-padding about-section">
      <div className="container about-grid">
        <div 
          ref={imgRef}
          className={`about-image-wrap reveal ${imgVisible ? 'reveal-visible' : ''}`}
        >
          <div className="about-image-bg"></div>
          <img src="/images/charles.jpg" alt="Charles R. Nobre" className="about-image" />
        </div>
        <div 
          ref={contentRef}
          className={`about-content reveal ${contentVisible ? 'reveal-visible' : ''}`}
        >
          <span className="about-tag">Seu Parceiro de Negócios</span>
          <h2 className="about-title">Sobre <span className="text-accent">Charles R. Nobre</span></h2>
          <span className="creci-badge">CRECI: 37177</span>
          <p className="about-text">
            Com anos de experiência no mercado imobiliário do litoral sul catarinense, 
            Charles R. Nobre tornou-se referência em consultoria para quem busca 
            não apenas um imóvel, mas um investimento seguro e um estilo de vida excepcional.
          </p>
          <p className="about-text">
            Focado nas regiões de <strong>Imbituba, Garopaba e Imaruí</strong>, Charles entende 
            as particularidades de cada praia e bairro, oferecendo uma curadoria personalizada 
            que une sofisticação, tranquilidade e valorização patrimonial.
          </p>
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
        }

        .about-image-bg {
          position: absolute;
          top: 2rem;
          left: -2rem;
          width: 100%;
          height: 100%;
          border: 2px solid var(--secondary);
          z-index: 1;
        }

        .about-image {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 600px;
          object-fit: cover;
          object-position: top;
          box-shadow: var(--shadow);
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
