import React, { useState, useEffect } from 'react';

const fetchAuth = (url, options = {}) => {
  const token = localStorage.getItem('aca_token');
  options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
  return fetch(url, options);
};

import { useAuth } from '../contexts/AuthContext';

export default function Configuracoes() {
  const { isMaster } = useAuth();
  const [activeTab, setActiveTab] = useState('auth');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('success');
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [configs, setConfigs] = useState({
    token: '',
    mensagem_template: '',
    wa_coords_x: '',
    wa_coords_y: '',
    intervalo_envio_s: 9,
    valor_limpeza: '',
    valor_consulta: '',
    dias_limpeza_kpi: '',
    dias_consulta_kpi: '',
    delay_fechamento_s: 7,
    fechar_aba_apos_envio: 'true',
    dias_exclusao_radar_limpeza: '',
    wa_delay_open_s: 2.5,
    wa_delay_before_send_s: 5,
    wa_delay_after_send_s: 1.5,
    wa_queue_close_tab: 'false',
    radar_limpeza_dias: 180,
    radar_limpeza_tags: 'limpeza, profilaxia'
  });

  const [tokenInput, setTokenInput] = useState('');
  
  // Real instance status
  const [realEvoStatus, setRealEvoStatus] = useState('Verificando...');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showTestEvo, setShowTestEvo] = useState(false);

  // Estados QR Code
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrBase64, setQrBase64] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrStatus, setQrStatus] = useState('');

  // Estados de Update
  const [updateLog, setUpdateLog] = useState({ users: '', orc: '', evo: '' });
  const [updateProgress, setUpdateProgress] = useState({ users: { pct: 0, text: '' }, orc: { pct: 0, text: '' }, evo: { pct: 0, text: '' } });
  const [lastUpdated, setLastUpdated] = useState({ users: '—', orc: '—', evo: '—' });

  useEffect(() => {
    fetchAuth(`${import.meta.env.MODE === "production" ? "https://api-aca.dmedia.com.br" : "http://localhost:3000"}/api/config`)
      .then(res => res.json())
      .then(data => {
        setConfigs(prev => ({ ...prev, ...data }));
        
        // Initialize last updated from DB
        setLastUpdated({
          users: data.last_update_users || '',
          patients: data.last_update_patients || '',
          metrics: data.last_update_metrics || '',
          budgets: data.last_update_budgets || ''
        });

        if (data.evo_instance && data.evo_apikey) {
          checkRealEvoStatus();
        } else {
          setRealEvoStatus('Não configurada');
        }
        setLoadingConfig(false);
      })
      .catch(err => {
        console.error("Erro ao carregar configurações:", err);
        setLoadingConfig(false);
      });
  }, []);

  const checkRealEvoStatus = () => {
    fetchAuth(`${import.meta.env.MODE === "production" ? "https://api-aca.dmedia.com.br" : "http://localhost:3000"}/api/config/evolution-status`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          if (data.state === 'OPEN') setRealEvoStatus('Conectada (Ativa)');
          else if (data.state === 'CONNECTING') setRealEvoStatus('Conectando...');
          else if (data.state === 'CLOSE' || data.state === 'DISCONNECTED') setRealEvoStatus('Desconectada');
          else setRealEvoStatus(data.state);
        } else {
          setRealEvoStatus('Erro de conexão');
        }
      })
      .catch(() => setRealEvoStatus('Erro'));
  };

  useEffect(() => {
    if (isMaster && activeTab === 'auth') setActiveTab('wa');
  }, [isMaster, activeTab]);

  const showStatus = (msg, type) => {
    setStatusMsg(msg);
    setStatusType(type);
    setTimeout(() => setStatusMsg(''), 5000);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfigs(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? String(checked) : value
    }));
  };

  const handleSaveAll = () => {
    fetchAuth(`${import.meta.env.MODE === "production" ? "https://api-aca.dmedia.com.br" : "http://localhost:3000"}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configs)
    })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          showStatus('✅ Configurações salvas com sucesso!', 'ok');
          setConfigs(prev => ({ ...prev, ...data.saved }));
        } else {
          showStatus('Erro ao salvar', 'err');
        }
      })
      .catch(() => showStatus('Servidor offline', 'err'));
  };

  const handleSaveToken = () => {
    const t = tokenInput.trim();
    if (!t) {
      showStatus('Token vazio', 'err');
      return;
    }
    
    fetchAuth(`${import.meta.env.MODE === "production" ? "https://api-aca.dmedia.com.br" : "http://localhost:3000"}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t })
    })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setConfigs(prev => ({ ...prev, token: data.saved.token }));
          setTokenInput('');
          showStatus('✅ Token salvo!', 'ok');
        } else {
          showStatus('Erro ao salvar token', 'err');
        }
      })
      .catch(() => showStatus('Servidor offline', 'err'));
  };

  const handleTestCurrentToken = () => {
    showStatus('Testando token atual salvo...', '');
    fetchAuth(`${import.meta.env.MODE === "production" ? "https://api-aca.dmedia.com.br" : "http://localhost:3000"}/api/config/testar-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
      .then(res => res.json())
      .then(data => {
        const msg = data.ok ? `Token atual OK: ${data.msg}` : `Token atual inválido: ${data.msg}`;
        showStatus(msg, data.ok ? 'ok' : 'err');
      })
      .catch(() => showStatus('Servidor offline', 'err'));
  };

  const handleTestNewToken = () => {
    const t = tokenInput.trim();
    showStatus('Testando...', '');
    fetchAuth(`${import.meta.env.MODE === "production" ? "https://api-aca.dmedia.com.br" : "http://localhost:3000"}/api/config/testar-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t })
    })
      .then(res => res.json())
      .then(data => showStatus(data.msg, data.ok ? 'ok' : 'err'))
      .catch(() => showStatus('Servidor offline', 'err'));
  };

  const handleFetchQr = async () => {
    setQrLoading(true);
    setQrStatus('Buscando QR Code na Evolution API...');
    setShowQrModal(true);
    setQrBase64('');
    
    try {
      const res = await fetchAuth(`${import.meta.env.MODE === "production" ? "https://api-aca.dmedia.com.br" : "http://localhost:3000"}/api/config/evolution-qr`);
      const data = await res.json();
      
      if (data.ok && data.base64) {
        setQrBase64(data.base64);
        setQrStatus('QR Code gerado com sucesso! Escaneie pelo WhatsApp.');
      } else {
        setQrStatus(data.msg || 'Erro desconhecido.');
      }
    } catch (err) {
      setQrStatus('Erro de conexão com o servidor local.');
    }
    setQrLoading(false);
  };

  const startSSEUpdate = (endpoint, key) => {
    return new Promise((resolve, reject) => {
      setUpdateProgress(p => ({ ...p, [key]: { pct: 0, text: 'Conectando...' } }));
      setUpdateLog(p => ({ ...p, [key]: 'Iniciando...' }));

      const eventSource = new EventSource(`${import.meta.env.MODE === "production" ? "https://api-aca.dmedia.com.br" : "http://localhost:3000"}/api/update/${endpoint}`);

      eventSource.addEventListener('start', (e) => {
        const data = JSON.parse(e.data);
        setUpdateLog(p => ({ ...p, [key]: `Iniciou: ${data.msg}` }));
      });

      eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse(e.data);
        const total = data.total > 0 ? data.total : data.atual; 
        const pct = data.total > 0 ? Math.round((data.atual / data.total) * 100) : 100;
        setUpdateProgress(p => ({ ...p, [key]: { pct, text: `${data.atual} / ${total}` } }));
        setUpdateLog(p => ({ ...p, [key]: `Processando: ${data.paciente} (${data.msg})` }));
      });

      eventSource.addEventListener('end', (e) => {
        const data = JSON.parse(e.data);
        setUpdateLog(p => ({ ...p, [key]: `✅ ${data.msg}` }));
        
        // Mantém a contagem 999/999 visível no final
        const finalCount = data.processados || data.total || 0;
        setUpdateProgress(p => ({ ...p, [key]: { pct: 100, text: `${finalCount} / ${finalCount} (Concluído)` } }));
        
        // Define a última atualização
        const now = new Date();
        const timestampStr = now.toLocaleDateString() + ' às ' + now.toLocaleTimeString();
        setLastUpdated(p => ({ ...p, [key]: timestampStr }));

        // Salvar a data no banco em background
        fetchAuth(`${import.meta.env.MODE === "production" ? "https://api-aca.dmedia.com.br" : "http://localhost:3000"}/api/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [`last_update_${key}`]: timestampStr })
        }).catch(() => {});

        eventSource.close();
        resolve(true);
      });

      eventSource.onerror = (e) => {
        console.error("SSE Error", e);
        setUpdateLog(p => ({ ...p, [key]: `❌ Erro na conexão com o servidor.` }));
        eventSource.close();
        resolve(false); // Resolvemos em vez de rejeitar para não quebrar a cadeia no Atualizar Tudo
      };
    });
  };

  const handleUpdateAll = async () => {
    showStatus('Atualização completa iniciada...', '');
    const usOk = await startSSEUpdate('usuarios', 'users');
    if (usOk) {
      const evOk = await startSSEUpdate('evolucoes', 'evo');
      if (evOk) {
        await startSSEUpdate('orcamentos', 'orc');
      }
    }
    showStatus('✅ Atualização em lote finalizada!', 'ok');
  };

  const renderProgressBar = (progressObj) => {
    if (!progressObj || progressObj.text === '') return null;
    return (
      <div style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
          <span>Progresso</span>
          <span>{progressObj.pct}% ({progressObj.text})</span>
        </div>
        <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressObj.pct}%`, background: 'var(--accent)', transition: 'width 0.3s' }}></div>
        </div>
      </div>
    );
  };

  if (loadingConfig) {
    return (
      <div className="page-loader">
        <div className="global-spinner"></div>
        <div>Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div id="tab-config">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Ajustes e Parâmetros do Sistema</div>
        {statusMsg && (
          <div className={`cfg-status log-${statusType}`} style={{ fontSize: '12px', color: statusType === 'err' ? 'var(--red)' : 'var(--green)' }}>
            {statusMsg}
          </div>
        )}
      </div>

      <div className="cfg-inner-tabs">
        {!isMaster && <div className={`cfg-inner-tab ${activeTab === 'auth' ? 'active' : ''}`} onClick={() => setActiveTab('auth')}>Autenticação</div>}
        <div className={`cfg-inner-tab ${activeTab === 'wa' ? 'active' : ''}`} onClick={() => setActiveTab('wa')}>WhatsApp & Mensagens</div>
        {!isMaster && <div className={`cfg-inner-tab ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}>Regras e Valores</div>}
        {!isMaster && <div className={`cfg-inner-tab ${activeTab === 'update' ? 'active' : ''}`} onClick={() => setActiveTab('update')}>Atualização da Base</div>}
      </div>

      {!isMaster && activeTab === 'auth' && (
        <div className="cfg-card">
          <div className="cfg-pane active">
            <h4>🔑 Token de Autenticação</h4>
            <div className="modal-section">
              <label>Token atual</label>
              <div className="cfg-row" style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={configs.token || ''} 
                  readOnly 
                  style={{ opacity: '.6', cursor: 'default', flex: 1 }} 
                />
                <button className="btn btn-ghost" onClick={handleTestCurrentToken}>🧪 Testar token atual</button>
              </div>
            </div>
            <div className="modal-section" style={{ marginTop: '16px' }}>
              <label>Novo token (header x-auth-token do DevTools)</label>
              <div className="cfg-row" style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Cole aqui..." 
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-ghost" onClick={handleTestNewToken}>🧪 Testar</button>
                <button className="btn btn-primary" onClick={handleSaveToken}>💾 Salvar Token</button>
              </div>
            </div>
            
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-num">1</div>
                <p>Abra o Simples Dental no Chrome</p>
              </div>
              <div className="step-card">
                <div className="step-num">2</div>
                <p>Pressione <code>F12</code> → aba <code>Network</code></p>
              </div>
              <div className="step-card">
                <div className="step-num">3</div>
                <p>Filtre por <code>api.simplesdental</code></p>
              </div>
              <div className="step-card">
                <div className="step-num">4</div>
                <p>Copie o valor de <code>x-auth-token</code></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wa' && (
        <>
          {/* TOPO: Título e Botão de Salvar Separados */}
          <div className="cfg-card" style={{ marginBottom: '20px' }}>
            <div className="cfg-pane active" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
              <h4 style={{ margin: 0 }}>💬 Configurações do WhatsApp Automático</h4>
              <button className="btn btn-primary" onClick={handleSaveAll}>💾 Salvar Tudo</button>
            </div>
          </div>

          {/* SESSÃO: API WHATSAPP */}
          <div className="cfg-card">
            <div className="cfg-pane active">
              {/* EVOLUTION API SECTION */}
              {!isMaster && (
                <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, color: 'var(--accent)' }}>🚀 API WhatsApp</h4>
                  <button type="button" className="btn btn-ghost" onClick={handleFetchQr} style={{ border: '1px solid var(--border)' }}>📱 Parear WhatsApp (QR)</button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px' }}>
                  conecte para enviar mensagens
                </div>
                
                <div className="cfg-grid-two" style={{ marginTop: '16px' }}>
                  <div className="modal-section">
                    <label>Status da Instância</label>
                    <div className="cfg-row" style={{ padding: '10px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong>{configs.evo_instance || 'Nenhuma'}</strong>
                      <span>-</span>
                      <span style={{ 
                        background: configs.evo_instance ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                        color: configs.evo_instance ? 'var(--green)' : 'var(--red)', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: realEvoStatus === 'Conectada (Ativa)' ? 'var(--green)' : 'var(--red)' }}></div>
                        {realEvoStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloco de Teste */}
                <div style={{ marginTop: '20px', padding: '15px', background: 'var(--bg)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setShowTestEvo(!showTestEvo)}
                  >
                    <h5 style={{ fontSize: '12px', margin: 0, color: 'var(--accent)' }}>🧪 Testar Disparo via WhatsApp API</h5>
                    <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{showTestEvo ? '▲' : '▼'}</span>
                  </div>
                  
                  {showTestEvo && (
                    <div style={{ marginTop: '16px' }}>
                      <div className="cfg-grid-two">
                        <div className="modal-section">
                          <label>Telefone de Teste</label>
                          <div className="cfg-row">
                            <input type="text" id="test_evo_phone" placeholder="5511999999999" defaultValue="" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="modal-section" style={{ marginTop: '10px' }}>
                        <label>Mensagem de Teste</label>
                        <div className="cfg-row">
                          <textarea id="test_evo_msg" rows="2" placeholder="Escreva a mensagem..." defaultValue="Olá! Esta é uma mensagem de teste enviada pela API." style={{ resize: 'none' }}></textarea>
                        </div>
                      </div>
                      
                      <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button 
                          className="btn btn-primary" 
                          onClick={async (e) => {
                            const btn = e.currentTarget;
                            const originalText = btn.textContent;
                            btn.textContent = 'Enviando...';
                            btn.disabled = true;
                            
                            try {
                              const phone = document.getElementById('test_evo_phone').value;
                              const message = document.getElementById('test_evo_msg').value;
                              
                              const res = await fetchAuth(`${import.meta.env.MODE === "production" ? "https://api-aca.dmedia.com.br" : "http://localhost:3000"}/api/config/testar-evolution`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  url: configs.evo_url,
                                  instance: configs.evo_instance,
                                  apikey: configs.evo_apikey,
                                  phone,
                                  message
                                })
                              });
                              const data = await res.json();
                              
                              if (data.ok) {
                                showStatus('✅ Mensagem de teste enviada com sucesso!', 'ok');
                              } else {
                                showStatus('❌ ' + data.msg, 'err');
                              }
                            } catch (err) {
                              showStatus('❌ Erro de conexão com o backend local.', 'err');
                            }
                            
                            btn.textContent = originalText;
                            btn.disabled = false;
                          }}
                        >
                          🚀 Testar Disparo
                        </button>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Lembre-se de "Salvar Tudo" antes de testar se você alterou as credenciais!</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

          <div className="cfg-card">
            <div className="cfg-pane active">
              <h4 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>💬 Configurações de Mensagens</h4>
              
              <div className="cfg-grid-two">
                <div className="modal-section" style={{ gridColumn: '1 / -1' }}>
                  <label>Template de Mensagem Padrão</label>
                  <textarea 
                    name="mensagem_template"
                    value={configs.mensagem_template || ''} 
                    onChange={handleChange}
                    placeholder="Olá <%first_name%>! Tudo bem?..."
                  ></textarea>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                    Use <code>&lt;%first_name%&gt;</code> para inserir o primeiro nome do paciente.
                  </div>
                </div>

                <div className="modal-section">
                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Intervalo Máximo de Envio (s)</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent)' }}>Até {configs.intervalo_envio_s || 9}s</span>
                  </label>
                  <div className="cfg-row">
                    <input 
                      type="range" 
                      min="2" max="15" 
                      name="intervalo_envio_s" 
                      value={configs.intervalo_envio_s || 9} 
                      onChange={handleChange} 
                      style={{ flex: 1, accentColor: 'var(--accent)' }} 
                    />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                    O sistema sorteará um tempo aleatório (entre 2s e o tempo configurado) a cada envio para imitar comportamento humano e evitar bloqueio anti-spam.
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </>
      )}

      {!isMaster && activeTab === 'rules' && (
        <div className="cfg-card">
          <div className="cfg-pane active">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4>⚙️ Regras e Valores (Por Módulos)</h4>
              <button className="btn btn-primary" onClick={handleSaveAll}>💾 Salvar Tudo</button>
            </div>


            <h5 style={{ fontSize: '13px', color: 'var(--accent)', marginBottom: '10px' }}>🦷 Módulo: Radar de Limpeza</h5>
            <div className="cfg-grid-two" style={{ marginBottom: '20px' }}>
              <div className="modal-section">
                <label>Dias para entrar no Radar (Amostra)</label>
                <div className="cfg-row">
                  <input type="number" name="radar_limpeza_dias" value={configs.radar_limpeza_dias || ''} onChange={handleChange} />
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                  Pacientes sem limpeza há mais de X dias entrarão no radar automaticamente.
                </div>
              </div>

              <div className="modal-section">
                <label>Tags de Limpeza (separadas por vírgula)</label>
                <div className="cfg-row">
                  <input type="text" name="radar_limpeza_tags" placeholder="Ex: limpeza, profilaxia, raspagem" value={configs.radar_limpeza_tags || ''} onChange={handleChange} />
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                  O sistema varrerá as evoluções buscando exatamente essas palavras na API.
                </div>
              </div>
            </div>

            <h5 style={{ fontSize: '13px', color: 'var(--accent)', marginBottom: '10px' }}>💵 KPIs Financeiros Gerais</h5>
            <div className="cfg-grid-two">
              <div className="modal-section">
                <label>Valor Médio Limpeza (R$)</label>
                <div className="cfg-row">
                  <input type="number" name="valor_limpeza" value={configs.valor_limpeza || ''} onChange={handleChange} />
                </div>
              </div>

              <div className="modal-section">
                <label>Valor Médio Consulta (R$)</label>
                <div className="cfg-row">
                  <input type="number" name="valor_consulta" value={configs.valor_consulta || ''} onChange={handleChange} />
                </div>
              </div>

              <div className="modal-section">
                <label>KPI: Dias para retorno Limpeza</label>
                <div className="cfg-row">
                  <input type="number" name="dias_limpeza_kpi" value={configs.dias_limpeza_kpi || ''} onChange={handleChange} />
                </div>
              </div>

              <div className="modal-section">
                <label>KPI: Dias para retorno Consulta</label>
                <div className="cfg-row">
                  <input type="number" name="dias_consulta_kpi" value={configs.dias_consulta_kpi || ''} onChange={handleChange} />
                </div>
              </div>

              <div className="modal-section">
                <label>Exclusão Radar Limpeza (dias)</label>
                <div className="cfg-row">
                  <input type="number" name="dias_exclusao_radar_limpeza" value={configs.dias_exclusao_radar_limpeza || ''} onChange={handleChange} />
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                  Pacientes que fizeram limpeza a mais de X dias não entram no radar.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {!isMaster && activeTab === 'update' && (
          <div className="cfg-pane active">
            <div className="cfg-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>🔄 Atualização da Base (100% via API)</h4>
                <button className="btn btn-warn" onClick={handleUpdateAll}>🌐 Atualizar Tudo</button>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
                Conecta-se ao Simples Dental via API para sincronizar pacientes, evoluções e orçamentos automaticamente.
              </div>
              <div className="up-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                
                {/* USUARIOS */}
                <div className="up-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '13px', padding: '14px' }}>
                  <h5 style={{ fontSize: '13px', margin: '0 0 6px 0', color: 'var(--text)' }}>👥 1. Usuários e Base</h5>
                  <div className="up-desc" style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px', minHeight: '32px' }}>
                    Busca a listagem completa de pacientes diretamente da API.
                  </div>
                  <button className="btn btn-primary" onClick={() => startSSEUpdate('usuarios', 'users')}>🔄 Iniciar Sincronização</button>
                  
                  {renderProgressBar(updateProgress.users)}
                  
                  <div className="up-status" style={{ marginTop: '10px', borderTop: '1px dashed var(--border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Última atualização: {lastUpdated.users}</div>
                    <div className="up-step" style={{ fontSize: '11px', color: 'var(--accent)', opacity: '.95' }}>
                      Status: {updateLog.users || 'Aguardando ação...'}
                    </div>
                  </div>
                </div>
                
                {/* EVOLUÇÕES */}
                <div className="up-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '13px', padding: '14px' }}>
                  <h5 style={{ fontSize: '13px', margin: '0 0 6px 0', color: 'var(--text)' }}>🦷 2. Atualizar Evoluções</h5>
                  <div className="up-desc" style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px', minHeight: '32px' }}>
                    Consulta a API para atualizar data da última limpeza e consultas de toda a base.
                  </div>
                  <button className="btn btn-primary" onClick={() => startSSEUpdate('evolucoes', 'evo')}>🔄 Iniciar Sincronização</button>
                  
                  {renderProgressBar(updateProgress.evo)}
                  
                  <div className="up-status" style={{ marginTop: '10px', borderTop: '1px dashed var(--border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Última atualização: {lastUpdated.evo}</div>
                    <div className="up-step" style={{ fontSize: '11px', color: 'var(--accent)', opacity: '.95' }}>
                      Status: {updateLog.evo || 'Aguardando ação...'}
                    </div>
                  </div>
                </div>
                
                {/* ORÇAMENTOS */}
                <div className="up-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '13px', padding: '14px' }}>
                  <h5 style={{ fontSize: '13px', margin: '0 0 6px 0', color: 'var(--text)' }}>💰 3. Atualizar Orçamentos</h5>
                  <div className="up-desc" style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px', minHeight: '32px' }}>
                    Busca orçamentos e detalhes de tratamentos em aberto.
                  </div>
                  <button className="btn btn-primary" onClick={() => startSSEUpdate('orcamentos', 'orc')}>🔄 Iniciar Sincronização</button>
                  
                  {renderProgressBar(updateProgress.orc)}
                  
                  <div className="up-status" style={{ marginTop: '10px', borderTop: '1px dashed var(--border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Última atualização: {lastUpdated.orc}</div>
                    <div className="up-step" style={{ fontSize: '11px', color: 'var(--accent)', opacity: '.95' }}>
                      Status: {updateLog.orc || 'Aguardando ação...'}
                    </div>
                  </div>
                </div>

                <div className="up-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '13px', padding: '14px' }}>
                  <h5 style={{ fontSize: '13px', margin: '0 0 6px 0', color: 'var(--text)' }}>⚡ Resumo Geral</h5>
                  <div className="up-desc" style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px', minHeight: '32px' }}>
                    Sempre atualize na ordem correta: Usuários (1) {'->'} Evoluções (2) e Orçamentos (3).
                  </div>
                  <div className="up-step" style={{ fontSize: '11px', color: 'var(--accent)', opacity: '.95', marginTop: '10px' }}>
                    Mantenha esta aba aberta durante a sincronização via API.
                  </div>
                </div>

              </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      <div className={`overlay ${showQrModal ? 'show' : ''}`}>
        <div className="modal" style={{ width: '400px', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '16px' }}>📱 Parear WhatsApp</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px', lineHeight: 1.4 }}>
            {qrStatus}
          </p>
          
          <div style={{ minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '20px', padding: '16px' }}>
            {qrLoading && <div className="global-spinner"></div>}
            {!qrLoading && qrBase64 && (
              <img src={qrBase64} alt="QR Code" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
            )}
            {!qrLoading && !qrBase64 && (
              <div style={{ fontSize: '32px' }}>⚠️</div>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setShowQrModal(false)}>Fechar</button>
          </div>
        </div>
      </div>

    </div>
  );
}
