import React, { useState, useEffect, useRef } from 'react';

const fetchAuth = (url, options = {}) => {
  const token = localStorage.getItem('aca_token');
  options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
  return fetch(url, options);
};

import { useSearchParams, useNavigate } from 'react-router-dom';

export default function Limpeza() {
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
  const [radarDias, setRadarDias] = useState(180);

  // Estados do DataTable
  const [search, setSearch] = useState('');
  const [filterPrio, setFilterPrio] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAmostra, setFilterAmostra] = useState('atrasados'); // 'atrasados', 'no_prazo', 'todos'
  const [sortField, setSortField] = useState('score');
  const [sortDir, setSortDir] = useState(-1);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    const fetchRadar = fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/limpeza/radar`).then(res => res.json());
    const fetchCampList = fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/campanhas`).then(res => res.json());
    
    let fetchCamp = null;
    if (urlCampaignId) {
      fetchCamp = fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/campanhas/${urlCampaignId}`).then(res => res.json());
    } else {
      // Se não há id, resetamos os estados locais (fechar campanha)
      setIsCampaignActive(false);
      setCampaignName('');
      setCampaignId(null);
      setIsValidated(false);
    }

    Promise.all([fetchRadar, fetchCampList, fetchCamp])
      .then(([radarData, campList, campData]) => {
        setRadarDias(radarData.radarDias || 180);
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
        
        const mapped = (radarData.pacientes || []).map(p => {
          const score = p.score || 0;
          let prioLabel = score >= 5 ? 'ALTA' : score >= 3 ? 'MEDIA' : 'BAIXA';
          let prioClass = score >= 5 ? 'prio-high' : score >= 3 ? 'prio-mid' : 'prio-low';
          
          const ev_date = p.ultima_limpeza_data ? new Date(p.ultima_limpeza_data) : null;
          const diffDias = ev_date ? Math.floor((new Date() - ev_date) / (1000 * 60 * 60 * 24)) : 9999;
          
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
            limpeza: p.ultima_limpeza_data ? ev_date.toLocaleDateString('pt-BR') : '-',
            evolucao: p.ultima_evolucao_data ? new Date(p.ultima_evolucao_data).toLocaleDateString('pt-BR') : '-',
            ultimo_proc: p.ultimo_proc,
            score: p.score || 0,
            prioridade: prioLabel,
            prioClass: prioClass,
            selected: selected,
            status: status,
            diffDias: diffDias
          };
        });
        setPacientes(mapped);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao carregar dados do radar/campanha:", err);
        setLoading(false);
      });
  }, [urlCampaignId]);

  // Base da amostra (afetada apenas pelo filtro temporal)
  const amostraData = pacientes.filter(p => {
    if (filterAmostra === 'atrasados' && p.diffDias <= radarDias) return false;
    if (filterAmostra === 'no_prazo' && p.diffDias > radarDias) return false;
    return true;
  });

  // Filtros da tabela (busca, status, prioridade)
  let filteredData = amostraData.filter(p => {
    if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) && !p.id_sDental.includes(search)) return false;
    if (filterStatus === 'nao' && p.status === '✓') return false;
    if (filterStatus === 'sim' && p.status !== '✓') return false;
    if (filterPrio && p.prioridade !== filterPrio) return false;
    return true;
  });

  if (sortField) {
    filteredData.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (sortField === 'limpeza') {
        valA = a.limpeza === '-' ? 0 : new Date(a.limpeza.split('/').reverse().join('-')).getTime();
        valB = b.limpeza === '-' ? 0 : new Date(b.limpeza.split('/').reverse().join('-')).getTime();
      }

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
      const res = await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/campanhas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nameVal })
      });
      const novaCamp = await res.json();

      if (selectVal) {
        const resOld = await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/campanhas/${selectVal}`);
        const oldCamp = await resOld.json();
        
        if (oldCamp && oldCamp.alvos && oldCamp.alvos.length > 0) {
          await Promise.all(oldCamp.alvos.map(alvo => 
            fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/campanhas/${novaCamp.id}/alvo/${alvo.paciente_id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status_envio: 'PENDENTE' }) // Herdar apenas a seleção, limpar o status
            })
          ));
        }
      }
      
      navigate(`/limpeza?campanha_id=${novaCamp.id}`);
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
      const resCfg = await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/config`);
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

      const maxDelayConfig = parseInt(configs.intervalo_envio_s) || 9;

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
          const res = await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/config/testar-evolution`, {
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
            // Update backend
            if (campaignId) {
              await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/campanhas/${campaignId}/alvo/${p.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status_envio: 'ENVIADO' })
              });
            }
          } else {
            console.error(`Erro ao enviar para ${p.nome}:`, data.msg);
            if (campaignId) {
              await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/campanhas/${campaignId}/alvo/${p.id}`, {
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
          const minDelay = 2; // Mínimo de 2 segundos para dar respiro
          const delaySeconds = Math.floor(Math.random() * (Math.max(maxDelayConfig, minDelay) - minDelay + 1)) + minDelay;
          
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
      
      // Finaliza a campanha no backend
      if (campaignId) {
        try {
          await fetchAuth(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/campanhas/${campaignId}/finalizar`, {
            method: 'PUT'
          });
        } catch (e) {
          console.error("Erro ao finalizar campanha no backend:", e);
        }
      }
      
      // Fecha a campanha no frontend para evitar duplo envio acidental
      setTimeout(() => {
        navigate('/limpeza');
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
        <div>Carregando Radar de Limpeza...</div>
      </div>
    );
  }

  return (
    <div id="tab-radar">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Jornada de Limpeza
          <div className="tt-wrap" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--border)', color: 'var(--text)', fontSize: '10px', cursor: 'help', marginLeft: '6px' }}>
            ?
            <div className="tt tt-down" style={{ width: '260px', whiteSpace: 'normal', fontWeight: 'normal', textTransform: 'none', textAlign: 'left', lineHeight: '1.4' }}>
              <div className="tt-date" style={{ marginBottom: '6px', fontSize: '11px', color: 'var(--accent)' }}>Como o Score é calculado:</div>
              <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: 'var(--green)', fontWeight: 700 }}>+3 pts:</span> <span>Possui orçamento em aberto</span></div>
              <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: 'var(--green)', fontWeight: 700 }}>+1 pt:</span> <span>Orçamento ≥ R$ 1.000</span></div>
              <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: 'var(--green)', fontWeight: 700 }}>+1 pt:</span> <span>Orçamento ≥ R$ 5.000</span></div>
              <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: 'var(--green)', fontWeight: 700 }}>+2 pts:</span> <span>Limpeza atrasada (amostra cfg.)</span></div>
              <div style={{ display: 'flex', gap: '6px' }}><span style={{ color: 'var(--green)', fontWeight: 700 }}>+1 pt:</span> <span>Sem consulta geral há &gt; 60 dias</span></div>
            </div>
          </div>
        </div>
        <div id="r-range-badge" style={{ background: 'rgba(234,179,8,.15)', border: '1px solid rgba(234,179,8,.35)', color: '#fde68a', borderRadius: '999px', padding: '6px 11px', fontSize: '11px', fontWeight: '700' }}>
          🦷 Range ativo da Amostra: {radarDias} dias
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '16px' }}>
        <div className="kpi blue"><div className="kpi-lbl">Total Analisados</div><div className="kpi-val">{amostraData.length}</div><div className="kpi-sub">pacientes na amostra</div></div>
        <div className="kpi red"><div className="kpi-lbl">🔴 Alta Prioridade</div><div className="kpi-val">{amostraData.filter(p => p.prioridade === 'ALTA').length}</div><div className="kpi-sub">ligar agora</div></div>
        <div className="kpi yellow"><div className="kpi-lbl">🟡 Média Prioridade</div><div className="kpi-val">{amostraData.filter(p => p.prioridade === 'MEDIA').length}</div><div className="kpi-sub">WhatsApp em breve</div></div>
        <div className="kpi green"><div className="kpi-lbl">✅ Enviados Campanha</div><div className="kpi-val">{amostraData.filter(p => p.status === '✓').length}</div><div className="kpi-sub">na amostra</div></div>
      </div>

      {/* CARD DE CAMPANHA ATIVA / CONTROLE DE FLUXO */}
      <div id="camp-active-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '13px', padding: '18px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: '700' }}>
                {isCampaignActive ? `📋 ${campaignName}` : '📋 Nenhuma Campanha Ativa'}
              </span>
              <span className="camp-badge" style={{ background: isCampaignActive ? 'rgba(79,142,247,.12)' : 'rgba(255,255,255,.05)', color: isCampaignActive ? 'var(--accent)' : 'var(--muted)' }}>
                {isCampaignActive ? 'Ativa' : 'Inativo'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              {isCampaignActive ? 'Selecione os pacientes na tabela abaixo para adicionar à fila de disparo.' : 'Crie uma nova campanha para habilitar a seleção de pacientes.'}
            </div>
          </div>
          
          {/* Contador Destaque de Selecionados */}
          {isCampaignActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(79,142,247,.1)', border: '1px solid rgba(79,142,247,.2)', padding: '10px 18px', borderRadius: '10px' }}>
              <span style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent)', lineHeight: '1' }}>{selectedCount}</span>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Selecionados</span>
            </div>
          )}

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
                <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', background: 'var(--bg)' }} onClick={() => navigate('/limpeza')}>
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
          <input type="text" placeholder="🔍 Buscar paciente..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
          
          <select value={filterPrio} onChange={e => { setFilterPrio(e.target.value); setCurrentPage(1); }}>
            <option value="">Todas prioridades</option>
            <option value="ALTA">🔴 Alta</option>
            <option value="MEDIA">🟡 Média</option>
          </select>

          {(() => {
            const countAtrasados = pacientes.filter(p => p.diffDias > radarDias).length;
            const countNoPrazo = pacientes.filter(p => p.diffDias <= radarDias).length;
            return (
              <select value={filterAmostra} onChange={e => { setFilterAmostra(e.target.value); setCurrentPage(1); }}>
                <option value="atrasados">⚠️ &gt;{radarDias}d - [{countAtrasados}]</option>
                <option value="no_prazo">✅ &le;{radarDias}d - [{countNoPrazo}]</option>
                <option value="todos">🌐 Todos - [{pacientes.length}]</option>
              </select>
            );
          })()}

          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
            <option value="">Todos os status</option>
            <option value="nao">Não enviados</option>
            <option value="sim">Já enviados</option>
          </select>

          <button className={`sort-btn ${sortField === 'score' ? 'active' : ''}`} onClick={() => { setSortField('score'); setSortDir(sortField === 'score' ? -sortDir : -1); setCurrentPage(1); }}>{sortField === 'score' && sortDir === 1 ? '↑' : '↓'} Score</button>
          <button className={`sort-btn ${sortField === 'limpeza' ? 'active' : ''}`} onClick={() => { setSortField('limpeza'); setSortDir(sortField === 'limpeza' ? -sortDir : -1); setCurrentPage(1); }}>🦷 Limpeza</button>
          <button className={`sort-btn ${sortField === 'nome' ? 'active' : ''}`} onClick={() => { setSortField('nome'); setSortDir(sortField === 'nome' ? -sortDir : 1); setCurrentPage(1); }}>A-Z</button>

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
              <th style={{ width: '40px' }}>ID</th>
              <th onClick={() => handleSort('nome')} style={{ cursor: 'pointer' }}>Paciente {sortField === 'nome' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('limpeza')} style={{ cursor: 'pointer' }}>Última Limpeza {sortField === 'limpeza' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('diffDias')} style={{ cursor: 'pointer' }}>Dias {sortField === 'diffDias' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('evolucao')} style={{ cursor: 'pointer' }}>Última Consulta {sortField === 'evolucao' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('score')} style={{ cursor: 'pointer' }}>Score {sortField === 'score' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('prioridade')} style={{ cursor: 'pointer' }}>Prioridade {sortField === 'prioridade' && (sortDir === 1 ? '↑' : '↓')}</th>
              <th style={{ textAlign: 'center' }}>✓</th>
              <th>WA</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((p, index) => (
              <tr key={p.id} className={p.selected ? 'tr-playing' : ''}>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={p.selected} onChange={() => toggleSelect(p.id)} disabled={!isCampaignActive || isValidated} />
                </td>
                <td>{p.id_sDental}</td>
                <td style={{ fontWeight: 500 }}>
                  <div className="tt-wrap">
                    {p.nome}
                    {p.ultimo_proc && (
                      <div className="tt">
                        <div className="tt-date">Último histórico ({p.evolucao})</div>
                        {p.ultimo_proc}
                      </div>
                    )}
                  </div>
                </td>
                <td>{p.limpeza}</td>
                <td>{p.diffDias === 9999 ? '-' : `${p.diffDias} dias`}</td>
                <td>{p.evolucao}</td>
                <td>
                  <div className="score-wrap">
                    <div className="score-bg">
                      <div className="score-fill" style={{ width: `${Math.min(100, (p.score / 8) * 100)}%`, background: p.score >= 5 ? 'var(--red)' : p.score >= 3 ? 'var(--yellow)' : 'var(--green)' }}></div>
                    </div>
                    <span style={{ color: p.score >= 5 ? 'var(--red)' : p.score >= 3 ? 'var(--yellow)' : 'var(--green)', fontWeight: 700, fontSize: '11px', marginLeft: '5px' }}>{p.score}</span>
                  </div>
                </td>
                <td>{p.prioridade === 'ALTA' ? <span className="prio-high">🔴 ALTA</span> : p.prioridade === 'MEDIA' ? <span className="prio-mid">🟡 MED</span> : <span className="prio-low">⚪ BAIXA</span>}</td>
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
                <input id="m-camp-nome" className="cfg-input" type="text" placeholder="Ex: Limpeza Julho 2026..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                
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
          <div className="sub">Use tags para personalizar automaticamente</div>
          <div className="modal-section">
            <label>Preview</label>
            <textarea rows="5" defaultValue="Olá <%first_name%>! Tudo bem? Aqui é da Clínica ACA..."></textarea>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setIsMsgModalOpen(false)}>Fechar</button>
          </div>
        </div>
      </div>

    </div>
  </div>
);
}
