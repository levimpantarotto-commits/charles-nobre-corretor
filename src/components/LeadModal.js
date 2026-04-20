'use client';
import { useState } from 'react';
import { useLead } from '@/context/LeadContext';

export default function LeadModal() {
  const { isModalOpen, closeLeadModal, propertyTitle } = useLead();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);

  if (!isModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    // Format WhatsApp message
    const waNumber = '5548999459527';
    const sheetUrl = 'https://script.google.com/macros/s/AKfycbwh55T7NZJ7poASgGz6uxZiAeixxuyAElM4F6r__Ekpf6pDYCiqRGNv7ztF86jFHg3kCQ/exec';

    // Send to Google Sheets
    try {
      fetch(sheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, property: propertyTitle })
      });
    } catch (err) {
      console.error('Error sending to sheets:', err);
    }

    const baseMsg = propertyTitle 
      ? `Olá Charles! Tenho interesse no imóvel: *${propertyTitle}*.` 
      : 'Olá Charles! Gostaria de mais informações sobre seus imóveis.';
    
    const leadInfo = `\n\n*Meus Dados:*\nNome: ${formData.name}\nE-mail: ${formData.email}\nTelefone: ${formData.phone}`;
    
    const fullMsg = encodeURIComponent(baseMsg + leadInfo);
    const waUrl = `https://wa.me/${waNumber}?text=${fullMsg}`;

    // Redirect after a short delay to feel "processed"
    setTimeout(() => {
      window.open(waUrl, '_blank');
      closeLeadModal();
      setLoading(false);
      setFormData({ name: '', email: '', phone: '' });
    }, 1000);
  };

  return (
    <div className="modal-overlay" onClick={closeLeadModal}>
      <div className="modal-content reveal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeLeadModal}>&times;</button>
        
        <div className="modal-header">
          <h3>Falar com <span className="text-accent">Charles R. Nobre</span></h3>
          <p>Preencha os dados abaixo para receber um atendimento exclusivo {propertyTitle ? `sobre ${propertyTitle}` : ''}.</p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Qual seu nome?</label>
            <input 
              type="text" 
              placeholder="Ex: João Silva" 
              required 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>E-mail</label>
            <input 
              type="email" 
              placeholder="joao@exemplo.com" 
              required 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>WhatsApp / Telefone</label>
            <input 
              type="tel" 
              placeholder="(48) 99999-9999" 
              required 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Processando...' : 'Iniciar Conversa no WhatsApp'}
          </button>
          
          <p className="modal-note">Ao enviar, você concorda com nossa política de privacidade e em receber contato profissional.</p>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(10, 25, 47, 0.85);
          backdrop-filter: blur(10px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .modal-content {
          background: var(--white);
          width: 100%;
          max-width: 500px;
          border-radius: 12px;
          padding: 3rem;
          position: relative;
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);
        }

        .modal-close {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          font-size: 2rem;
          color: var(--text-muted);
          transition: var(--transition);
        }

        .modal-close:hover {
          color: var(--secondary);
          transform: rotate(90deg);
        }

        .modal-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .modal-header h3 {
          font-size: 1.8rem;
          margin-bottom: 0.75rem;
          color: var(--primary);
        }

        .modal-header p {
          color: var(--text-muted);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .modal-form .form-group {
          margin-bottom: 1.5rem;
        }

        .modal-form label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .modal-form input {
          width: 100%;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          transition: var(--transition);
        }

        .modal-form input:focus {
          outline: none;
          border-color: var(--secondary);
          box-shadow: 0 0 0 4px rgba(197, 160, 89, 0.1);
        }

        .w-full {
          width: 100%;
          margin-top: 1rem;
        }

        .modal-note {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-align: center;
          margin-top: 1.5rem;
          line-height: 1.4;
        }

        @media (max-width: 480px) {
          .modal-content {
            padding: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
