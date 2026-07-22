import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle, XCircle, MessageCircle } from 'lucide-react';

const fetchAuth = (url, options = {}) => {
  const token = localStorage.getItem('aca_token');
  options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
  return fetch(url, options);
};

export default function CampanhaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campanha, setCampanha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, PENDENTE, ENVIADO, RESPONDIDO
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [selectedAlvos, setSelectedAlvos] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  useEffect(() => {
    fetchDetalhes();
  }, [id]);

  const fetchDetalhes = async () => {
    try {
      const res = await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/campanhas/${id}`);
      if (!res.ok) throw new Error('Falha ao carregar campanha');
      const data = await res.json();
      setCampanha(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="global-spinner"></div>
        <div>Carregando métricas da campanha...</div>
      </div>
    );
  }

  if (!campanha) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Campanha não encontrada</h2>
        <button className="btn btn-primary" onClick={() => navigate('/campanhas')}>Voltar</button>
      </div>
    );
  }

  const alvos = campanha.alvos || [];
  
  const metrics = {
    total: alvos.length,
    enviados: alvos.filter(a => a.status_envio === 'ENVIADO' || a.status_envio === 'RESPONDIDO').length,
    pendentes: alvos.filter(a => a.status_envio === 'PENDENTE' || a.status_envio === 'ERRO').length,
    respondidos: alvos.filter(a => a.status_envio === 'RESPONDIDO').length,
  };

  const taxaConversao = metrics.enviados > 0 ? Math.round((metrics.respondidos / metrics.enviados) * 100) : 0;

  const handleReenviar = async () => {
    if (selectedAlvos.length === 0) return;
    setIsSending(true);
    setSendProgress(0);

    try {
      const resCfg = await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/config`);
      const configs = await resCfg.json();
      
      if (!configs.evo_url || !configs.evo_instance || !configs.evo_apikey) {
        alert("Configurações da Evolution API incompletas.");
        setIsSending(false);
        return;
      }

      let campaignBotoes = null;
      if (campanha.botoes) {
        try { campaignBotoes = JSON.parse(campanha.botoes); } catch (e) {}
      }

      for (let i = 0; i < selectedAlvos.length; i++) {
        const alvoId = selectedAlvos[i];
        const alvo = alvos.find(a => a.paciente_id === alvoId);
        if (!alvo) continue;

        const firstName = alvo.paciente.nome.split(' ')[0];
        const msg = (campanha.mensagem_template || '').replace(/<%first_name%>/g, firstName);

        try {
          const res = await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/config/testar-evolution`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: configs.evo_url,
              instance: configs.evo_instance,
              apikey: configs.evo_apikey,
              phone: alvo.paciente.telefone,
              message: msg,
              botoes: campaignBotoes
            })
          });
          const data = await res.json();
          
          await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/campanhas/${campanha.id}/alvo/${alvoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_envio: data.ok ? 'ENVIADO' : 'ERRO' })
          });
        } catch (err) {
          console.error(`Erro ao reenviar para ${alvo.paciente.nome}:`, err);
        }
        setSendProgress(i + 1);
        await new Promise(r => setTimeout(r, (parseInt(configs.intervalo_envio_s) || 9) * 1000));
      }
      
      setSelectedAlvos([]);
      fetchDetalhes(); // Recarrega os dados atualizados
    } catch (err) {
      console.error(err);
      alert("Erro ao reenviar mensagens.");
    }
    setIsSending(false);
  };

  const filteredAlvos = alvos.filter(a => {
    if (filter !== 'ALL' && a.status_envio !== filter) return false;
    if (search && !a.paciente.nome.toLowerCase().includes(search.toLowerCase()) && !a.paciente.telefone.includes(search)) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredAlvos.length / itemsPerPage);
  const currentData = filteredAlvos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div id="tab-detalhes" style={{ animation: 'fadeIn 0.3s ease', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button 
          className="btn btn-ghost" 
          onClick={() => navigate('/campanhas')}
          style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0' }}>{campanha.nome}</h2>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Criada em: {new Date(campanha.data_inicio).toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="cfg-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>TOTAL ALVOS</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{metrics.total}</div>
          </div>
        </div>

        <div className="cfg-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>ENVIADOS</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{metrics.enviados}</div>
          </div>
        </div>

        <div className="cfg-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--yellow)' }}>
            <XCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>PENDENTES / ERRO</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{metrics.pendentes}</div>
          </div>
        </div>

        <div className="cfg-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--accent)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '12px', right: '-24px', background: 'var(--accent)', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '2px 24px', transform: 'rotate(45deg)', letterSpacing: '1px' }}>
            EM BREVE
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(79,142,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <MessageCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 'bold' }}>RESPOSTAS ({taxaConversao}%)</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent)' }}>{metrics.respondidos}</div>
          </div>
        </div>
      </div>

      <div className="cfg-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', margin: 0 }}>Histórico de Pacientes</h3>
            <input 
              type="text" 
              placeholder="🔍 Buscar paciente..." 
              className="cfg-input" 
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ width: '220px', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px' }}
            />
            {selectedAlvos.length > 0 && (
              <button 
                className="btn btn-primary" 
                onClick={handleReenviar} 
                disabled={isSending}
                style={{ fontSize: '13px', padding: '6px 12px' }}
              >
                {isSending ? `Enviando... (${sendProgress}/${selectedAlvos.length})` : `Reenviar Selecionados (${selectedAlvos.length})`}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setFilter('ALL'); setCurrentPage(1); }}>Todos</button>
            <button className={`btn ${filter === 'PENDENTE' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setFilter('PENDENTE'); setCurrentPage(1); }}>Pendentes</button>
            <button className={`btn ${filter === 'ENVIADO' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setFilter('ENVIADO'); setCurrentPage(1); }}>Enviados</button>
            <button className={`btn ${filter === 'RESPONDIDO' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setFilter('RESPONDIDO'); setCurrentPage(1); }} style={{ color: filter !== 'RESPONDIDO' ? 'var(--accent)' : '' }}>Respondidos</button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 8px', width: '40px' }}>
                  <input 
                    type="checkbox" 
                    onChange={(e) => {
                      if (e.target.checked) {
                        const pendentes = currentData.filter(a => a.status_envio === 'PENDENTE' || a.status_envio === 'ERRO').map(a => a.paciente_id);
                        setSelectedAlvos(prev => [...new Set([...prev, ...pendentes])]);
                      } else {
                        const pendentes = currentData.map(a => a.paciente_id);
                        setSelectedAlvos(prev => prev.filter(id => !pendentes.includes(id)));
                      }
                    }}
                    checked={currentData.filter(a => a.status_envio === 'PENDENTE' || a.status_envio === 'ERRO').length > 0 && currentData.filter(a => a.status_envio === 'PENDENTE' || a.status_envio === 'ERRO').every(a => selectedAlvos.includes(a.paciente_id))}
                  />
                </th>
                <th style={{ padding: '12px 8px', color: 'var(--muted)', fontSize: '12px' }}>PACIENTE</th>
                <th style={{ padding: '12px 8px', color: 'var(--muted)', fontSize: '12px' }}>TELEFONE</th>
                <th style={{ padding: '12px 8px', color: 'var(--muted)', fontSize: '12px' }}>STATUS</th>
                <th style={{ padding: '12px 8px', color: 'var(--muted)', fontSize: '12px' }}>RESPOSTA</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>Nenhum alvo encontrado neste filtro.</td>
                </tr>
              ) : (
                currentData.map(a => {
                  const podeReenviar = a.status_envio === 'PENDENTE' || a.status_envio === 'ERRO';
                  return (
                    <tr key={a.paciente_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px' }}>
                        {podeReenviar && (
                          <input 
                            type="checkbox" 
                            checked={selectedAlvos.includes(a.paciente_id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedAlvos(prev => [...prev, a.paciente_id]);
                              else setSelectedAlvos(prev => prev.filter(id => id !== a.paciente_id));
                            }}
                          />
                        )}
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: '500' }}>{a.paciente.nome}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--muted)' }}>{a.paciente.telefone}</td>
                    <td style={{ padding: '12px 8px' }}>
                      {a.status_envio === 'RESPONDIDO' && <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '11px', background: 'rgba(79,142,247,0.1)', padding: '4px 8px', borderRadius: '4px' }}>RESPONDIDO</span>}
                      {a.status_envio === 'ENVIADO' && <span style={{ color: 'var(--green)', fontWeight: 'bold', fontSize: '11px', background: 'rgba(34,197,94,0.1)', padding: '4px 8px', borderRadius: '4px' }}>ENVIADO</span>}
                      {a.status_envio === 'PENDENTE' && <span style={{ color: 'var(--muted)', fontWeight: 'bold', fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>PENDENTE</span>}
                      {a.status_envio === 'ERRO' && <span style={{ color: 'var(--red)', fontWeight: 'bold', fontSize: '11px', background: 'rgba(239,68,68,0.1)', padding: '4px 8px', borderRadius: '4px' }}>ERRO</span>}
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--text)', fontStyle: 'italic', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.resposta_texto || '-'}
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 8px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Mostrando {currentData.length} de {filteredAlvos.length}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Ant.</button>
                <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 'bold' }}>{currentPage} / {totalPages}</span>
                <button className="btn btn-ghost" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Próx. →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
