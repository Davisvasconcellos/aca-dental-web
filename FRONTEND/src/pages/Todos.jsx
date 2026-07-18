import React, { useState, useEffect, useRef } from 'react';

const fetchAuth = (url, options = {}) => {
  const token = localStorage.getItem('aca_token');
  options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
  return fetch(url, options);
};

import { useSearchParams, useNavigate } from 'react-router-dom';

export default function Todos() {
  const [isCampModalOpen, setIsCampModalOpen] = useState(false);
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  
  // Estados da Campanha
  const [searchParams] = useSearchParams();
  const urlCampaignId = searchParams.get('campanha_id');
  const navigate = useNavigate();
  const [isCampaignActive, setIsCampaignActive] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignId, setCampaignId] = useState(urlCampaignId || null);
  const [allCampanhas, setAllCampanhas] = useState([]);
  const [isValidated, setIsValidated] = useState(false);
  
  // Estados da Fila de Envio (Evolution)
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [queueTotal, setQueueTotal] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('');
  const abortRef = useRef(false);
  
  // Estados da Tabela
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados do DataTable
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState('score');
  const [sortDir, setSortDir] = useState(-1);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    const fetchPacientes = fetchAuth('http://localhost:3000/api/pacientes').then(res => res.json());
    const fetchCampList = fetchAuth('http://localhost:3000/api/campanhas').then(res => res.json());
    
    let fetchCamp = null;
    if (urlCampaignId) {
      fetchCamp = fetchAuth(`http://localhost:3000/api/campanhas/${urlCampaignId}`).then(res => res.json());
    } else {
      setIsCampaignActive(false);
      setCampaignName('');
      setCampaignId(null);
      setIsValidated(false);
    }

    Promise.all([fetchPacientes, fetchCampList, fetchCamp])
      .then(([pacientesData, campList, campData]) => {
        if (Array.isArray(campList)) setAllCampanhas(campList);
        
        const alvosMap = {};
        if (campData && !campData.error) {
          setIsCampaignActive(true);
          setCampaignName(campData.nome);
          setCampaignId(campData.id);
          campData.alvos.forEach(a => {
            alvosMap[a.paciente_id] = a.status_envio;
          });
        }
        
        const mapped = pacientesData.map(p => {
          let selected = false;
          let status = '-';
          if (campData && !campData.error && alvosMap[p.id]) {
            if (alvosMap[p.id] === 'ENVIADO') {
              status = '✓';
            } else {
              selected = true;
            }
          }
          
          return {
            id: p.id,
            id_sDental: p.id_sDental,
            nome: p.nome,
            celular: p.telefone || '-',
            consulta: p.ultima_evolucao_data ? new Date(p.ultima_evolucao_data).toLocaleDateString('pt-BR') : '-',
            limpeza: p.ultima_limpeza_data ? new Date(p.ultima_limpeza_data).toLocaleDateString('pt-BR') : '-',
            score: p.score || 0,
            selected: selected,
            status: status
          };
        });
        setPacientes(mapped);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar pacientes/campanhas:", err);
        setLoading(false);
      });
  }, [urlCampaignId]);

  let filteredData = pacientes.filter(p => {
    if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) && !p.celular.includes(search)) return false;
    if (filterStatus === 'ativos' && p.score === 0) return false;
    if (filterStatus === 'nao' && p.status === '✓') return false;
    if (filterStatus === 'sim' && p.status !== '✓') return false;
    return true;
  });

  if (sortField) {
    filteredData.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return -1 * sortDir;
      if (valA > valB) return 1 * sortDir;
      return 0;
    });
  }

  const handleSort = (field) => {
    setSortField(field);
    setSortDir(sortField === field ? -sortDir : -1);
    setCurrentPage(1);
  };
  
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const selectedCount = pacientes.filter(p => p.selected).length;
  const allSelected = currentData.length > 0 && currentData.every(p => p.selected);

  const handleConfigCampaign = async (e) => {
    e.preventDefault();
    const selectVal = document.getElementById('m-camp-select')?.value;
    const nameVal = document.getElementById('m-camp-nome')?.value;

    if (!nameVal) {
      alert("Informe o nome da nova campanha.");
      return;
    }

    try {
      const res = await fetchAuth('http://localhost:3000/api/campanhas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nameVal })
      });
      const novaCamp = await res.json();

      if (selectVal) {
        const resOld = await fetchAuth(`http://localhost:3000/api/campanhas/${selectVal}`);
        const oldCamp = await resOld.json();
        
        if (oldCamp && oldCamp.alvos && oldCamp.alvos.length > 0) {
          await Promise.all(oldCamp.alvos.map(alvo => 
            fetchAuth(`http://localhost:3000/api/campanhas/${novaCamp.id}/alvo/${alvo.paciente_id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status_envio: 'PENDENTE' })
            })
          ));
        }
      }
      
      navigate(`/todos?campanha_id=${novaCamp.id}`);
      setIsCampModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao criar campanha no banco de dados.");
    }
  };

  const startEvolutionQueue = async () => {
    const selectedPacientes = pacientes.filter(p => p.selected);
    if (selectedPacientes.length === 0) {
      alert("Selecione pelo menos um paciente para enviar.");
      return;
    }

    try {
      const resCfg = await fetchAuth('http://localhost:3000/api/config');
      const configs = await resCfg.json();
      
      if (!configs.evo_url || !configs.evo_instance || !configs.evo_apikey) {
        alert("Configurações da Evolution API incompletas. Vá na aba de Configurações.");
        return;
      }
      
      const template = configs.mensagem_template;
      if (!template) {
        alert("Template de mensagem padrão não está configurado.");
        return;
      }

      abortRef.current = false;
      setIsSending(true);
      setQueueTotal(selectedPacientes.length);
      setSendProgress(0);
      setCurrentStatus('Iniciando fila...');

      const delaySeconds = configs.intervalo_envio_s || 9;

      for (let i = 0; i < selectedPacientes.length; i++) {
        if (abortRef.current) {
          setCurrentStatus('Fila cancelada pelo usuário.');
          break;
        }

        const p = selectedPacientes[i];
        const firstName = p.nome.split(' ')[0];
        const msg = template.replace(/<%first_name%>/g, firstName);
        
        setCurrentStatus(`Enviando para ${firstName}... (${i+1}/${selectedPacientes.length})`);
        
        try {
          const res = await fetchAuth('http://localhost:3000/api/config/testar-evolution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: configs.evo_url,
              instance: configs.evo_instance,
              apikey: configs.evo_apikey,
              phone: p.celular,
              message: msg
            })
          });
          const data = await res.json();
          
          if (data.ok) {
            setPacientes(prev => prev.map(pt => pt.id === p.id ? { ...pt, status: '✓', selected: false } : pt));
            if (campaignId) {
              await fetchAuth(`http://localhost:3000/api/campanhas/${campaignId}/alvo/${p.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status_envio: 'ENVIADO' })
              });
            }
          } else {
            console.error(`Erro ao enviar para ${p.nome}:`, data.msg);
            if (campaignId) {
              await fetchAuth(`http://localhost:3000/api/campanhas/${campaignId}/alvo/${p.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status_envio: 'ERRO' })
              });
            }
          }
        } catch (err) {
          console.error(`Erro na requisição para ${p.nome}:`, err);
        }

        setSendProgress(i + 1);

        if (i < selectedPacientes.length - 1 && !abortRef.current) {
          setCurrentStatus(`Aguardando ${delaySeconds}s (Anti-Spam)...`);
          let msWaited = 0;
          const waitMs = delaySeconds * 1000;
          while (msWaited < waitMs) {
            if (abortRef.current) break;
            await new Promise(r => setTimeout(r, 500));
            msWaited += 500;
          }
        }
      }

      if (!abortRef.current) {
        setCurrentStatus('✅ Todos os envios concluídos! Fechando campanha...');
      } else {
        setCurrentStatus('⏹️ Fila interrompida. Fechando campanha...');
      }
      setIsSending(false);
      
      if (campaignId) {
        try {
          await fetchAuth(`http://localhost:3000/api/campanhas/${campaignId}/finalizar`, { method: 'PUT' });
        } catch (e) {
          console.error("Erro ao finalizar campanha no backend:", e);
        }
      }
      
      setTimeout(() => {
        navigate('/todos');
        setIsCampaignActive(false);
        setCampaignId(null);
        setIsValidated(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setIsSending(false);
    }
  };

  const toggleSelectAll = () => {
    if (!isCampaignActive || isValidated) return;
    const newVal = !allSelected;
    const currentIds = currentData.map(p => p.id);
    setPacientes(pacientes.map(p => currentIds.includes(p.id) ? { ...p, selected: newVal } : p));
  };

  const toggleSelect = (id) => {
    if (!isCampaignActive || isValidated) return;
    setPacientes(pacientes.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="global-spinner"></div>
        <div>Carregando Banco de Pacientes...</div>
      </div>
    );
  }

  return (
    <div id="tab-todos">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Todos os Pacientes</div>
        <div style={{ background: 'rgba(79,142,247,.15)', border: '1px solid rgba(79,142,247,.35)', color: '#93c5fd', borderRadius: '999px', padding: '6px 11px', fontSize: '11px', fontWeight: '700' }}>
          👥 Base Completa
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '16px' }}>
        <div className="kpi purple"><div className="kpi-lbl">Total de Pacientes</div><div className="kpi-val">{pacientes.length}</div><div className="kpi-sub">cadastrados no sistema</div></div>
        <div className="kpi blue"><div className="kpi-lbl">Ativos</div><div className="kpi-val">{pacientes.filter(p => p.score > 0).length}</div><div className="kpi-sub">com interações recentes</div></div>
        <div className="kpi yellow"><div className="kpi-lbl">Com Celular</div><div className="kpi-val">{pacientes.filter(p => p.celular !== '-').length}</div><div className="kpi-sub">base para mensagens</div></div>
        <div className="kpi green"><div className="kpi-lbl">Enviados Campanha</div><div className="kpi-val">{pacientes.filter(p => p.status === '✓').length}</div><div className="kpi-sub">nesta sessão</div></div>
      </div>

      {/* Console de Envios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginTop: '12px', marginBottom: '16px' }}>
        
        {/* Card 1: Campanha */}
        <div className="cfg-card" style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>1. Campanha</div>
          {!isCampaignActive ? (
            <>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px' }}>Nenhuma campanha ativa.</div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setIsCampModalOpen(true)}>
                ⚙️ Configurar Campanha
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent)', marginBottom: '12px' }}>{campaignName}</div>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', background: 'var(--bg)' }} onClick={() => navigate('/todos')}>
                ❌ Fechar Campanha
              </button>
            </>
          )}
        </div>

        {/* Card 2: Validação */}
        <div className="cfg-card" style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', opacity: isCampaignActive ? 1 : 0.5 }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>2. Seleção e Validação</div>
          {!isCampaignActive ? (
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Aguardando campanha...</div>
          ) : (
            <>
              {!isValidated ? (
                <>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
                    Selecione os pacientes na tabela abaixo e valide a fila. <br/>
                    <strong>{selectedCount}</strong> selecionados.
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={selectedCount === 0} onClick={() => setIsValidated(true)}>
                    ✅ Validar {selectedCount} pacientes
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 'bold', marginBottom: '12px' }}>
                    Fila validada com {selectedCount} pacientes!
                  </div>
                  <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', background: 'var(--bg)' }} onClick={() => setIsValidated(false)} disabled={isSending}>
                    ✏️ Editar Seleção
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Card 3: Disparo */}
        <div className="cfg-card" style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', opacity: isValidated ? 1 : 0.5 }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>3. Fila de Disparo (Evolution API)</div>
          {!isValidated ? (
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Aguardando validação...</div>
          ) : (
            <>
              {!isSending ? (
                <>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>Pronto para iniciar os envios automáticos.</div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={startEvolutionQueue}>
                    ▶️ Iniciar Disparos
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '11px', color: 'var(--text)', marginBottom: '6px' }}>{currentStatus}</div>
                  <div className="send-progress-bar" style={{ marginBottom: '10px' }}>
                    <div className="send-progress-fill" style={{ width: `${(sendProgress / queueTotal) * 100}%` }}></div>
                  </div>
                  <button className="btn btn-warn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { abortRef.current = true; }}>
                    ⏹️ Parar Fila
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="tbl-wrap">
        <div className="tbl-toolbar">
          <input type="text" placeholder="🔍 Buscar por nome ou telefone..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
            <option value="">Status: Todos</option>
            <option value="ativos">Apenas Ativos</option>
            <option value="nao">Não enviados</option>
            <option value="sim">Já enviados</option>
          </select>
          <button className={`sort-btn ${sortField === 'nome' ? 'active' : ''}`} onClick={() => handleSort('nome')}>A-Z</button>
          <button className={`sort-btn ${sortField === 'score' ? 'active' : ''}`} onClick={() => handleSort('score')}>Score</button>
          <button className={`sort-btn ${sortField === 'limpeza' ? 'active' : ''}`} onClick={() => handleSort('limpeza')}>Limpeza</button>
          
          <div className="ml-auto" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={() => setIsMsgModalOpen(true)}>✉️ Mensagem</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={!isCampaignActive || isValidated} />
              </th>
              <th style={{ width: '40px' }}>#</th>
              <th>Paciente</th>
              <th>Celular</th>
              <th>Última Consulta</th>
              <th>Última Limpeza</th>
              <th>Score</th>
              <th style={{ textAlign: 'center' }}>✓</th>
              <th>WA</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr><td colSpan="9" style={{textAlign: 'center', padding: '20px'}}>Nenhum paciente encontrado.</td></tr>
            ) : currentData.map((p, index) => (
              <tr key={p.id} className={p.selected ? 'tr-playing' : ''}>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={p.selected} onChange={() => toggleSelect(p.id)} disabled={!isCampaignActive || isValidated} />
                </td>
                <td>{p.id_sDental}</td>
                <td style={{ fontWeight: 500 }}>{p.nome}</td>
                <td>{p.celular}</td>
                <td>{p.consulta}</td>
                <td>{p.limpeza}</td>
                <td>
                  <div className="score-wrap">
                    <div className="score-bg">
                      <div className="score-fill" style={{ width: `${Math.min(100, (p.score / 8) * 100)}%`, background: p.score >= 5 ? 'var(--red)' : p.score >= 3 ? 'var(--yellow)' : 'var(--green)' }}></div>
                    </div>
                    <span style={{ color: p.score >= 5 ? 'var(--red)' : p.score >= 3 ? 'var(--yellow)' : 'var(--green)', fontWeight: 700, fontSize: '11px', marginLeft: '5px' }}>{p.score}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>{p.status}</td>
                <td>-</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <div className="page-info">
            Mostrando {currentData.length} de {filteredData.length} registros
            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ marginLeft: '10px', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </div>
          <div className="page-btns">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Ant.</button>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Próx. →</button>
          </div>
        </div>
      </div>

      {/* Modal de Criação / Carregamento de Campanha */}
      <div className={`overlay ${isCampModalOpen ? 'show' : ''}`}>
        <div className="modal" style={{ width: '400px' }}>
          <h3 style={{ marginBottom: '16px' }}>⚙️ Configurar Campanha</h3>
            
            <form onSubmit={handleConfigCampaign}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--muted)' }}>
                  1. NOME DA NOVA CAMPANHA
                </label>
                <input id="m-camp-nome" className="cfg-input" type="text" placeholder="Ex: Avisos Gerais..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                
                <div style={{ marginTop: '20px', marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--muted)' }}>
                    2. CARREGAR PACIENTES DE CAMPANHA EXISTENTE (OPCIONAL)
                  </label>
                  <select id="m-camp-select" className="cfg-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} defaultValue="">
                    <option value="">(Iniciar do zero)</option>
                    {allCampanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsCampModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Continuar</button>
              </div>
            </form>
        </div>
      </div>

      {/* MODAL: Configurar Mensagem */}
      <div className={`overlay ${isMsgModalOpen ? 'show' : ''}`}>
        <div className="modal">
          <h3>✉️ Configurar Mensagem</h3>
          <div className="sub">Personalize o disparo em massa</div>
          <div className="modal-section">
            <label>Texto</label>
            <textarea rows="5" defaultValue="Olá <%first_name%>! Passando para avisar que..."></textarea>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setIsMsgModalOpen(false)}>Fechar</button>
          </div>
        </div>
      </div>

    </div>
  );
}
