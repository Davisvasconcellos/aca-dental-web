import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link as LinkIcon, Eye, EyeOff, Smartphone } from 'lucide-react';

export default function Integracoes() {
  const { isMaster } = useAuth();
  
  const [evoConfig, setEvoConfig] = useState({ evo_url: '', evo_apikey: '' });
  const [evoStatus, setEvoStatus] = useState('verificando...');
  const [evoInstances, setEvoInstances] = useState([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loadingState, setLoadingState] = useState('');
  const [toast, setToast] = useState({ msg: '', type: '', visible: false });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  useEffect(() => {
    if (isMaster) loadData();
  }, [isMaster]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('aca_token');
      const resEvo = await fetch(`${import.meta.env.MODE === "production" ? "https://api-aca.dmedia.com.br" : "http://localhost:3000"}/api/admin/evolution`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resEvo.ok) {
        const evoData = await resEvo.json();
        setEvoConfig({ evo_url: evoData.config.evo_url || '', evo_apikey: evoData.config.evo_apikey || '' });
        setEvoStatus(evoData.status);
        setEvoInstances(evoData.instances || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEvo = async (e) => {
    e.preventDefault();
    setLoadingState('salvando_evo_config');
    setEvoStatus('verificando...');
    try {
      const token = localStorage.getItem('aca_token');
      const res = await fetch(`${import.meta.env.MODE === "production" ? "https://api-aca.dmedia.com.br" : "http://localhost:3000"}/api/admin/evolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(evoConfig)
      });
      if (res.ok) {
        showToast('Configurações salvas!');
        loadData(); // Vai recarregar e testar o status automaticamente
      } else {
        showToast('Erro ao salvar.', 'error');
        setEvoStatus('erro');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
      setEvoStatus('erro');
    }
    setLoadingState('');
  };

  if (!isMaster) return null;

  return (
    <div style={{ padding: '20px', position: 'relative' }}>
      {toast.visible && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 99999, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.3s ease' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LinkIcon size={24} /> Integrações Globais
        </h2>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Configure os serviços de terceiros utilizados por toda a plataforma SaaS</div>
      </div>

      <div className="cfg-card">
        <h4 style={{ marginBottom: '20px' }}>🔌 Integração Principal - Evolution API</h4>
        
        <form onSubmit={handleSaveEvo}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Evolution API URL Base</label>
            <input required type="text" value={evoConfig.evo_url} onChange={e => setEvoConfig({ ...evoConfig, evo_url: e.target.value })} style={{ width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }} placeholder="Ex: https://api.seudominio.com" />
          </div>
          
          <div style={{ marginBottom: '25px', position: 'relative' }}>
            <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Global API Key</label>
            <div style={{ position: 'relative' }}>
              <input required type={showApiKey ? 'text' : 'password'} value={evoConfig.evo_apikey} onChange={e => setEvoConfig({ ...evoConfig, evo_apikey: e.target.value })} style={{ width: '100%', padding: '12px', paddingRight: '40px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }} placeholder="Sua chave secreta global..." />
              <button type="button" onClick={() => setShowApiKey(!showApiKey)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Status da Conexão:</div>
              {evoStatus === 'verificando...' && <div className="badge" style={{ background: 'var(--s1)', color: 'var(--muted)' }}>⏳ Verificando...</div>}
              {evoStatus === 'conectado' && <div className="badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--green)' }}>✅ Online e Conectado</div>}
              {evoStatus === 'erro' && <div className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)' }}>❌ Falha na Conexão</div>}
              {evoStatus === 'desconectado' && <div className="badge" style={{ background: 'var(--s1)', color: 'var(--muted)' }}>🔌 Sem Credenciais</div>}
            </div>
            <button type="submit" className="btn btn-primary" disabled={loadingState !== ''}>{loadingState === 'salvando_evo_config' ? 'Salvando...' : 'Salvar Configurações'}</button>
          </div>
        </form>

        {evoStatus === 'conectado' && evoInstances.length > 0 && (
          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <h5 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={16} color="var(--accent)" /> Instâncias Ativas no Servidor
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {evoInstances.map((inst, idx) => {
                const isOnline = inst.connectionStatus === 'open';
                return (
                  <div key={idx} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '5px', wordBreak: 'break-all' }}>{inst.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: isOnline ? 'var(--green)' : 'var(--muted)' }}>
                      <span className="dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? 'var(--green)' : 'var(--muted)' }}></span>
                      {isOnline ? 'Online' : inst.connectionStatus}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
