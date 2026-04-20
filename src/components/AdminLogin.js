'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError('Acesso negado. Verifique seu e-mail e senha.');
    } else {
      onLogin(data.session);
    }
    setLoading(false);
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <img src="/images/logo-trimmed.png" alt="Charles R. Nobre" width="80" />
          <h2>Acesso Restrito</h2>
          <p>Digite suas credenciais para gerenciar o portal.</p>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>E-mail</label>
            <input 
              type="email" 
              placeholder="exemplo@email.com" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>Senha</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Validando...' : 'Entrar no Painel'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .login-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #020617;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 2rem;
        }
        .login-card {
          background: white;
          width: 100%;
          max-width: 400px;
          padding: 3rem;
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .login-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .login-header h2 {
          color: var(--primary);
          margin: 1.5rem 0 0.5rem;
          font-family: 'Playfair Display', serif;
        }
        .login-header p {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .login-form .form-group {
          margin-bottom: 1.5rem;
        }
        .login-form label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--primary);
        }
        .login-form input {
          width: 100%;
          padding: 0.8rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          outline: none;
        }
        .login-form input:focus {
          border-color: var(--secondary);
        }
        .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 0.8rem;
          border-radius: 6px;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        .btn-login {
          width: 100%;
          background: var(--secondary);
          color: var(--primary);
          padding: 1rem;
          border: none;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }
        .btn-login:hover {
          filter: brightness(1.1);
        }
        .btn-login:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
