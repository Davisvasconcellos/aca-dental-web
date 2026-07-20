import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Stethoscope } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking'); // checking, online, offline
  const { login } = useAuth();

  useEffect(() => {
    fetch('https://aca-api.dmedia.com.br/')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'online') setApiStatus('online');
        else setApiStatus('offline');
      })
      .catch(() => setApiStatus('offline'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const res = await login(email, senha);
    if (!res.ok) {
      setError(res.msg);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="modal" style={{ width: '380px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Stethoscope size={48} color="var(--accent)" style={{ marginBottom: '10px' }} />
          <h2 style={{ fontSize: '24px', margin: 0 }}>ACA <span style={{ color: 'var(--accent)' }}>Dental</span></h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '5px', marginBottom: '5px' }}>Central de Inteligência</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
            <div style={{ fontSize: '10px', color: 'var(--accent)', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
              API: https://aca-api.dmedia.com.br
            </div>
            <div style={{ 
              fontSize: '10px', 
              color: apiStatus === 'online' ? '#10b981' : (apiStatus === 'checking' ? '#fbbf24' : '#ef4444'), 
              background: apiStatus === 'online' ? 'rgba(16, 185, 129, 0.1)' : (apiStatus === 'checking' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(239, 68, 68, 0.1)'), 
              padding: '4px 8px', 
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: apiStatus === 'online' ? '#10b981' : (apiStatus === 'checking' ? '#fbbf24' : '#ef4444')
              }}></div>
              {apiStatus === 'online' ? 'Online' : (apiStatus === 'checking' ? 'Verificando...' : 'Offline')}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '5px' }}>E-mail</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="cfg-input" 
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--s2)', color: 'var(--text)' }} 
              placeholder="seu@email.com"
            />
          </div>
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '5px' }}>Senha</label>
            <input 
              type="password" 
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="cfg-input" 
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--s2)', color: 'var(--text)' }} 
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: '14px' }} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
