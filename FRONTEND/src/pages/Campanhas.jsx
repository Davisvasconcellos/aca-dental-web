import React, { useState, useEffect } from 'react';

const fetchAuth = (url, options = {}) => {
  const token = localStorage.getItem('aca_token');
  options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
  return fetch(url, options);
};

import { useNavigate } from 'react-router-dom';

export default function Campanhas() {
  const [campanhas, setCampanhas] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // 12 cards por página
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampanhas();
  }, []);

  const fetchCampanhas = async () => {
    try {
      const res = await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/campanhas`);
      const data = await res.json();
      setCampanhas(data);
      setLoading(false);
    } catch (err) {
      console.error("Erro ao buscar campanhas:", err);
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setCampaignToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!campaignToDelete) return;
    
    try {
      await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/campanhas/${campaignToDelete}`, { method: 'DELETE' });
      setCampanhas(campanhas.filter(c => c.id !== campaignToDelete));
      setDeleteModalOpen(false);
      setCampaignToDelete(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir campanha.');
      setDeleteModalOpen(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ATIVA': return <span style={{ background: 'rgba(79,142,247,.12)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>ATIVA</span>;
      case 'PAUSADA': return <span style={{ background: 'rgba(234,179,8,.12)', color: 'var(--yellow)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>PAUSADA</span>;
      case 'CONCLUIDA': return <span style={{ background: 'rgba(34,197,94,.12)', color: 'var(--green)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>CONCLUÍDA</span>;
      default: return <span style={{ background: 'var(--border)', color: 'var(--muted)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{status}</span>;
    }
  };

  const handleCarregar = (id) => {
    navigate(`/limpeza?campanha_id=${id}`);
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="global-spinner"></div>
        <div>Carregando Histórico de Campanhas...</div>
      </div>
    );
  }

  return (
    <div id="tab-campanhas">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>Histórico de Campanhas</h2>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Acompanhe os envios em lote e recarregue campanhas anteriores.</div>
        </div>
        <div>
          <input 
            type="text" 
            placeholder="🔍 Buscar campanha..." 
            className="cfg-input" 
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: '250px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {(() => {
          const filtered = campanhas.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()));
          const totalPages = Math.ceil(filtered.length / itemsPerPage);
          const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
          
          if (filtered.length === 0) {
            return (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--muted)', background: 'var(--s2)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                Nenhuma campanha encontrada no histórico.
              </div>
            );
          }
          
          return (
            <>
              {currentData.map(c => {
                const date = new Date(c.data_inicio).toLocaleString('pt-BR');
                const progressPct = c.total_alvos > 0 ? Math.round((c.enviados / c.total_alvos) * 100) : 0;
                
                return (
                  <div key={c.id} className="cfg-card" onClick={() => navigate(`/campanhas/${c.id}`)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: '20px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'inline-block' }}>
                          {getStatusBadge(c.status)}
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>{c.nome}</h3>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Criada em: {date}</div>
                      </div>
                      <button 
                        className="btn btn-ghost" 
                        style={{ padding: '4px', fontSize: '16px', minWidth: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.7 }} 
                        title="Excluir Campanha"
                        onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                      >
                        🗑️
                      </button>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '6px', fontWeight: '500' }}>
                        Progresso de Envio
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ flex: 1, height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${progressPct}%`, height: '100%', background: progressPct === 100 ? 'var(--green)' : 'var(--accent)', transition: 'width 0.3s ease' }}></div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{progressPct}%</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        <strong>{c.enviados}</strong> enviados | <strong>{c.respondidos || 0}</strong> respondidos | Total: <strong>{c.total_alvos}</strong>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {c.mensagem_template || <span style={{ color: 'var(--muted)', fontWeight: 'normal' }}>Nenhuma mensagem configurada.</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {totalPages > 1 && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Mostrando {currentData.length} de {filtered.length}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Ant.</button>
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 'bold' }}>{currentPage} / {totalPages}</span>
                    <button className="btn btn-ghost" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Próx. →</button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <div className={`overlay ${deleteModalOpen ? 'show' : ''}`}>
        <div className="modal" style={{ width: '400px' }}>
          <h3 style={{ marginBottom: '12px', color: 'var(--red)' }}>⚠️ Excluir Campanha</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px', lineHeight: '1.4' }}>
            Tem certeza que deseja excluir esta campanha? <br/>
            <strong>Essa ação apagará todo o histórico de envios e não pode ser desfeita.</strong>
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={() => { setDeleteModalOpen(false); setCampaignToDelete(null); }}>
              Cancelar
            </button>
            <button className="btn btn-warn" onClick={confirmDelete}>
              Sim, excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
