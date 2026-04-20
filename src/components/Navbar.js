'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLead } from '@/context/LeadContext';

export default function Navbar() {
  const { openLeadModal } = useLead();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container nav-content-responsive">
        <Link 
          href="/" 
          className="logo-wrap-final" 
        >
          <img 
            src="/images/logo-trimmed.png" 
            alt="Charles R. Nobre" 
            className="logo-img-main"
          />
        </Link>
        <div className="nav-links">
          <Link href="/">Início</Link>
          <Link href="#properties">Imóveis</Link>
          <Link href="#about">Sobre</Link>
          <button onClick={() => openLeadModal()} className="btn-contact">Contato</button>
        </div>
      </div>

      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: linear-gradient(to bottom, rgba(0,0,0,0.92) 0%, transparent 100%);
          padding: 1.5rem 0; /* Adjusted for image logo */
          transition: var(--transition);
        }

        .navbar.scrolled {
          background: var(--glass);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 0.8rem 0;
          box-shadow: var(--shadow);
          border-bottom: 1px solid rgba(197, 160, 89, 0.2);
        }
        
        .nav-content-responsive {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .logo-wrap-final {
          display: flex;
          align-items: center;
          height: 60px; /* Refined size for better legibility */
          max-width: 320px;
          overflow: hidden;
          padding-left: 0.5rem; /* Slight offset for luxury balance */
          transition: var(--transition);
        }

        .logo-img-main {
          height: 60px !important;
          width: auto !important;
          object-fit: contain;
          object-position: left;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
          transition: var(--transition);
        }

        .navbar.scrolled .logo-img-main {
         /* If needed to invert colors on white background, but the logo has dark and light parts.
            Checking the logo: "CHARLES R. NOBRE" is white.
            On scrolled navbar (which is white glass), white text will be invisible.
            I NEED TO INVERT OR ADJUST THE LOGO COLOR FOR SCROLLED STATE.
          */
          filter: brightness(0.2) drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }

        .nav-links {
          display: flex;
          gap: clamp(1.5rem, 3.5vw, 3rem);
          align-items: center;
        }

        .nav-links :global(a), .nav-links button {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--white);
          text-transform: uppercase;
          letter-spacing: 2px;
          transition: var(--transition);
          opacity: 0.9;
        }

        .nav-links :global(a):hover {
          opacity: 1;
          color: var(--secondary);
        }

        .navbar.scrolled .nav-links :global(a), .navbar.scrolled .nav-links button {
          color: var(--primary);
        }

        .btn-contact {
          background: var(--gold-metallic) !important;
          color: var(--primary) !important;
          padding: 0.7rem 1.8rem !important;
          border-radius: 4px !important;
          font-weight: 700 !important;
          font-size: 0.75rem !important;
          box-shadow: 0 4px 20px rgba(197, 160, 89, 0.25);
        }

        .navbar.scrolled .btn-contact {
          background: var(--primary) !important;
          color: var(--white) !important;
          box-shadow: var(--shadow);
        }

        @media (max-width: 992px) {
          .nav-links { display: none; }
          .logo-wrap-final { height: 45px; }
        }
      `}</style>
    </nav>
  );
}
