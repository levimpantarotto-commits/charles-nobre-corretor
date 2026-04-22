'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaInstagram, FaFacebook, FaWhatsapp, FaEnvelope, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [footerData, setFooterData] = useState({
    email: 'levimpantarotto@gmail.com',
    phone: '(48) 99945-9527',
    creci: '37177',
    instagram: '#',
    facebook: '#',
    whatsapp: 'https://wa.me/5548999459527'
  });

  useEffect(() => {
    async function fetchFooter() {
      try {
        const res = await fetch('/api/configs');
        const data = await res.json();
        if (data) {
          if (data.contact_email) setFooterData(prev => ({ ...prev, email: data.contact_email }));
          if (data.contact_phone) setFooterData(prev => ({ ...prev, phone: data.contact_phone }));
          if (data.about_creci) setFooterData(prev => ({ ...prev, creci: data.about_creci }));
        }
      } catch (err) {
        console.error('Falha ao carregar Footer local');
      }
    }
    fetchFooter();
  }, []);

  return (
    <footer className="footer" id="contact">
      <div className="container footer-content">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo-wrap-footer">
               <img 
                 src="/images/logo-trimmed.png" 
                 alt="Charles R. Nobre Logo" 
                 className="footer-logo-img"
               />
            </div>
            <p className="footer-tagline">Consultoria Imobiliária de Alto Padrão no Litoral Sul de SC. Especialista em Imbituba, Garopaba e Imaruí.</p>
            <div className="social-links">
              <a href={footerData.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><FaInstagram /></a>
              <a href={footerData.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FaFacebook /></a>
              <a href={footerData.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><FaWhatsapp /></a>
            </div>
          </div>

          <div className="footer-nav">
            <h4>Navegação</h4>
            <ul>
              <li><Link href="/">Início</Link></li>
              <li><Link href="#properties">Imóveis</Link></li>
              <li><Link href="#about">Sobre</Link></li>
              <li><Link href="#contact">Contato</Link></li>
            </ul>
          </div>

          <div className="footer-contact">
            <h4>Contato</h4>
            <ul>
              <li><FaMapMarkerAlt /> <span>Imbituba, SC - Brasil</span></li>
              <li><FaPhone /> <span>{footerData.phone}</span></li>
              <li><FaEnvelope /> <span>{footerData.email}</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {currentYear} Charles R. Nobre. Todos os direitos reservados. Projeto de Elite.</p>
          <div className="footer-legal">
            <span>CRECI: {footerData.creci}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .footer { background: #020617; color: var(--white); padding: 8rem 0 3rem; border-top: 1px solid rgba(197, 160, 89, 0.1); position: relative; overflow: hidden; }
        .footer::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 80%; height: 1px; background: linear-gradient(90deg, transparent, rgba(197, 160, 89, 0.3), transparent); }
        .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1.5fr; gap: 4rem; margin-bottom: 6rem; }
        .logo-wrap-footer { margin-bottom: 2rem; height: 80px; }
        .footer-logo-img { height: 100%; width: auto; object-fit: contain; }
        .footer-tagline { font-size: 0.95rem; opacity: 0.6; max-width: 400px; line-height: 1.8; margin-bottom: 2.5rem; }
        .social-links { display: flex; gap: 1.5rem; }
        .social-links a { width: 45px; height: 45px; border-radius: 50%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: var(--white); transition: var(--transition); }
        .social-links a:hover { background: var(--gold-metallic); color: var(--primary); transform: translateY(-5px); box-shadow: 0 10px 20px rgba(197, 160, 89, 0.2); }
        .footer h4 { font-size: 1.2rem; font-family: 'Playfair Display', serif; margin-bottom: 2rem; position: relative; padding-bottom: 1rem; }
        .footer h4::after { content: ''; position: absolute; bottom: 0; left: 0; width: 30px; height: 2px; background: var(--secondary); }
        .footer ul { list-style: none; }
        .footer ul li { margin-bottom: 1.2rem; display: flex; align-items: center; gap: 1rem; font-size: 0.95rem; opacity: 0.7; transition: var(--transition); }
        .footer ul li:hover { opacity: 1; color: var(--secondary); transform: translateX(5px); }
        .footer-bottom { padding-top: 3rem; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; opacity: 0.5; }
        .footer-legal span { background: rgba(197, 160, 89, 0.1); color: var(--secondary); padding: 0.3rem 0.8rem; border-radius: 4px; }
        @media (max-width: 992px) { .footer-grid { grid-template-columns: 1fr; gap: 4rem; } .footer-bottom { flex-direction: column; gap: 1.5rem; text-align: center; } }
      `}</style>
    </footer>
  );
}
