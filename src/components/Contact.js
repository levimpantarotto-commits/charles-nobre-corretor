'use client';
import { useState } from 'react';
import useReveal from '@/hooks/useReveal';
import { useLead } from '@/context/LeadContext';

export default function Contact() {
  const { openLeadModal } = useLead();
  const [infoRef, infoVisible] = useReveal();
  const [formRef, formVisible] = useReveal();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const sheetUrl = 'https://script.google.com/macros/s/AKfycbwh55T7NZJ7poASgGz6uxZiAeixxuyAElM4F6r__Ekpf6pDYCiqRGNv7ztF86jFHg3kCQ/exec';

    try {
      await fetch(sheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: formData.name, 
          email: formData.email, 
          phone: 'Form Contato', // Phone is required in my script logic, so we pass a placeholder
          property: `Mensagem: ${formData.message}`
        })
      });
      alert('Mensagem enviada com sucesso! Charles entrará em contato em breve.');
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      console.error('Error:', err);
      alert('Erro ao enviar mensagem. Por favor, tente pelo WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="section-padding contact-section">
      <div className="container contact-content">
        <div 
          ref={infoRef}
          className={`contact-info reveal ${infoVisible ? 'reveal-visible' : ''}`}
        >
          <h2 className="contact-title">Vamos Encontrar seu <br /><span className="text-secondary">Próximo Destino?</span></h2>
          <p className="contact-text">
            Seja para investir ou morar, Charles R. Nobre está pronto para 
            guiar você através das melhores oportunidades em Imbituba, Garopaba e Imaruí.
          </p>
          
          <div className="contact-details">
            <div className="detail-item">
              <span className="detail-label">Localização</span>
              <span className="detail-value">Imbituba, Santa Catarina - Brasil</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Atendimento</span>
              <button onClick={() => openLeadModal()} className="detail-value-btn">+55 (48) 99945-9527</button>
            </div>
          </div>
        </div>

        <div 
          ref={formRef}
          className={`contact-form-wrap reveal ${formVisible ? 'reveal-visible' : ''}`}
        >
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <input 
                type="text" 
                placeholder="Seu Nome" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <input 
                type="email" 
                placeholder="Seu E-mail" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <textarea 
                placeholder="Como podemos ajudar?" 
                rows="5" 
                required
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
              ></textarea>
            </div>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Mensagem'}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .contact-section {
          background: var(--bg-dark);
          color: var(--white);
        }

        .contact-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6rem;
          align-items: center;
        }

        .contact-title {
          font-size: 3.5rem;
          margin-bottom: 2rem;
          line-height: 1.1;
        }

        .text-secondary {
          color: var(--secondary);
        }

        .contact-text {
          font-size: 1.2rem;
          opacity: 0.8;
          margin-bottom: 3rem;
          max-width: 500px;
        }

        .contact-details {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .detail-label {
          display: block;
          font-size: 0.8rem;
          color: var(--secondary);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 0.5rem;
        }

        .detail-value-btn {
          font-size: 1.25rem;
          color: var(--white);
          border: none;
          background: none;
          padding: 0;
          cursor: pointer;
          transition: var(--transition);
        }

        .detail-value-btn:hover {
          color: var(--secondary);
        }

        .contact-form-wrap {
          background: rgba(255, 255, 255, 0.05);
          padding: 3rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group input, .form-group textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 1rem;
          color: var(--white);
          border-radius: 4px;
          font-size: 1rem;
          transition: var(--transition);
        }

        .form-group input:focus, .form-group textarea:focus {
          border-color: var(--secondary);
          outline: none;
          background: rgba(255, 255, 255, 0.15);
        }

        .btn-submit {
          background: var(--secondary);
          color: var(--primary);
          padding: 1rem;
          border-radius: 4px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: var(--transition);
          border: none;
          cursor: pointer;
        }

        .btn-submit:hover {
          background: var(--accent);
          transform: translateY(-2px);
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 992px) {
          .contact-content {
            grid-template-columns: 1fr;
            gap: 4rem;
          }
          .contact-title {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </section>
  );
}
