import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Users, Plus, Edit2, Trash2, MapPin, Link as LinkIcon, Eye, EyeOff, Smartphone } from 'lucide-react';

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: 'var(--s1)', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}>
          <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '24px', lineHeight: '1' }}>&times;</button>
        </div>
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { isMaster, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('clinicas');
  
  const [clinicas, setClinicas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  
  // Modals state
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  // Forms & UI
  const [orgForm, setOrgForm] = useState({ id: '', nome: '', evo_instance: '' });
  const [editingOrg, setEditingOrg] = useState(null);
  const [userForm, setUserForm] = useState({ id: '', email: '', senha: '', organization_id: '' });
  const [evoConfig, setEvoConfig] = useState({ evo_url: '', evo_apikey: '' });
  const [evoStatus, setEvoStatus] = useState('verificando...');
  const [evoInstances, setEvoInstances] = useState([]);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [loadingState, setLoadingState] = useState(''); // '' | 'salvando_org' | 'salvando_evo'
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
      const headers = { 'Authorization': `Bearer ${token}` };

      const [resOrg, resUsr, resEvo] = await Promise.all([
        fetch('http://localhost:3000/api/admin/organizations', { headers }),
        fetch('http://localhost:3000/api/admin/users', { headers }),
        fetch('http://localhost:3000/api/admin/evolution', { headers })
      ]);
      
      if (resOrg.ok) setClinicas(await resOrg.json());
      if (resUsr.ok) setUsuarios(await resUsr.json());
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

  // --- Organizações ---
  const handleOpenOrgModal = (org = null) => {
    if (org) {
      setOrgForm(org);
    } else {
      setOrgForm({ id: '', nome: '', evo_instance: '' });
    }
    setIsOrgModalOpen(true);
  };

  const handleSaveOrg = async (e) => {
    e.preventDefault();
    setLoadingState('salvando_org');
    try {
      const token = localStorage.getItem('aca_token');
      const isEditing = !!orgForm.id;
      const url = isEditing 
        ? `http://localhost:3000/api/admin/organizations/${orgForm.id}` 
        : 'http://localhost:3000/api/admin/organizations';

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(orgForm)
      });
      
      if (!res.ok) {
        showToast('Erro ao salvar clínica.', 'error');
        setLoadingState('');
        return;
      }

      const data = await res.json();
      
      if (!isEditing) {
        setLoadingState('salvando_evo');
        const evoRes = await fetch(`http://localhost:3000/api/admin/organizations/${data.org.id}/create-instance`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (evoRes.ok) {
          showToast('Clínica e Instância criadas com sucesso!');
        } else {
          const evoData = await evoRes.json();
          showToast(`Clínica criada, mas a instância falhou: ${evoData.msg}`, 'error');
        }
      } else {
        showToast('Clínica atualizada com sucesso!');
      }

      setIsOrgModalOpen(false);
      loadData();
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    }
    setLoadingState('');
  };

  const handleDeleteOrg = async (id) => {
    if (!window.confirm("ATENÇÃO: Excluir esta clínica apagará TODOS os dados e usuários vinculados a ela. Tem certeza?")) return;
    try {
      const token = localStorage.getItem('aca_token');
      const res = await fetch(`http://localhost:3000/api/admin/organizations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Clínica excluída com sucesso!');
        loadData();
      } else {
        showToast('Erro ao excluir clínica.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    }
  };

  const openAddUserForOrg = (orgId) => {
    setIsOrgModalOpen(false); // Fecha o modal atual se estiver aberto
    setUserForm({ id: '', email: '', senha: '', organization_id: orgId });
    setIsUserModalOpen(true);
    setActiveTab('usuarios');
  };

  // --- Usuários ---
  const handleOpenUserModal = (user = null) => {
    if (user) {
      setUserForm({ id: user.id, email: user.email, senha: '', organization_id: user.organization_id || '' });
    } else {
      setUserForm({ id: '', email: '', senha: '', organization_id: '' });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setLoadingState('salvando_usr');
    try {
      const token = localStorage.getItem('aca_token');
      const isEditing = !!userForm.id;
      const url = isEditing 
        ? `http://localhost:3000/api/admin/users/${userForm.id}` 
        : 'http://localhost:3000/api/admin/users';

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(userForm)
      });
      if (res.ok) {
        showToast(isEditing ? 'Usuário atualizado com sucesso!' : 'Usuário Admin criado!');
        setIsUserModalOpen(false);
        loadData();
      } else {
        const data = await res.json();
        showToast(`Erro: ${data.msg}`, 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    }
    setLoadingState('');
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("ATENÇÃO: Deseja realmente excluir este usuário administrador?")) return;
    try {
      const token = localStorage.getItem('aca_token');
      const res = await fetch(`http://localhost:3000/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Usuário excluído com sucesso!');
        loadData();
      } else {
        showToast('Erro ao excluir usuário.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    }
  };

  // --- Configurações ---
  const handleSaveEvo = async (e) => {
    e.preventDefault();
    setLoadingState('salvando_evo_config');
    setEvoStatus('verificando...');
    try {
      const token = localStorage.getItem('aca_token');
      const res = await fetch('http://localhost:3000/api/admin/evolution', {
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
    <div id="tab-admin" style={{ padding: '20px', position: 'relative' }}>
      {toast.visible && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 99999, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.3s ease' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={24} /> Painel Master SaaS
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Gerenciamento Global de Clínicas e Usuários</div>
        </div>
        <button className="btn btn-ghost" onClick={logout} style={{ border: '1px solid var(--border)' }}>🚪 Sair (Logout)</button>
      </div>

      <div className="cfg-inner-tabs">
        <div className={`cfg-inner-tab ${activeTab === 'clinicas' ? 'active' : ''}`} onClick={() => setActiveTab('clinicas')}>
          <Building2 size={16} /> Clínicas (Organizations)
        </div>
        <div className={`cfg-inner-tab ${activeTab === 'usuarios' ? 'active' : ''}`} onClick={() => setActiveTab('usuarios')}>
          <Users size={16} /> Usuários Admins
        </div>
        <div className={`cfg-inner-tab ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
          <LinkIcon size={16} /> Configs da Plataforma
        </div>
      </div>

      {/* ABA DE CLÍNICAS */}
      {activeTab === 'clinicas' && (
        <div className="cfg-card">
          <div className="cfg-pane active">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ margin: 0 }}>🏢 Clínicas Cadastradas no SaaS</h4>
              <button className="btn btn-primary" onClick={() => handleOpenOrgModal()}>
                <Plus size={16} /> Nova Clínica
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {clinicas.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--muted)', background: 'var(--bg)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                  Nenhuma clínica cadastrada.
                </div>
              )}
              {clinicas.map(c => {
                const adminsCount = usuarios.filter(u => u.organization_id === c.id).length;
                return (
                  <div key={c.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', color: 'var(--text)' }}>{c.nome}</h3>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <LinkIcon size={12} /> {c.evo_instance}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleOpenOrgModal(c)} title="Editar"><Edit2 size={14} /></button>
                        <button className="btn btn-ghost" style={{ padding: '6px', color: 'var(--red)' }} onClick={() => handleDeleteOrg(c.id)} title="Excluir"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Users size={14} /> {adminsCount} Admin(s)
                      </div>
                      <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px', border: '1px solid var(--border)' }} onClick={() => openAddUserForOrg(c.id)}>
                        + Adicionar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ABA DE USUÁRIOS */}
      {activeTab === 'usuarios' && (
        <div className="cfg-card">
          <div className="cfg-pane active">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ margin: 0 }}>👤 Administradores Ativos</h4>
              <button className="btn btn-primary" onClick={() => handleOpenUserModal()}>
                <Plus size={16} /> Novo Admin
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 10px', color: 'var(--muted)' }}>E-mail</th>
                  <th style={{ padding: '12px 10px', color: 'var(--muted)' }}>Perfil</th>
                  <th style={{ padding: '12px 10px', color: 'var(--muted)' }}>Clínica Vinculada</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--muted)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>Nenhum usuário cadastrado.</td>
                  </tr>
                )}
                {usuarios.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', background: 'var(--s1)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{u.email}</td>
                    <td style={{ padding: '12px 10px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--accent)', color: 'white', fontSize: '11px', fontWeight: 'bold' }}>{u.role}</span></td>
                    <td style={{ padding: '12px 10px', color: 'var(--muted)' }}>
                      {u.organization ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={14} color="var(--accent)" /> {u.organization.nome}
                        </div>
                      ) : 'Nenhuma'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button className="btn btn-ghost" style={{ padding: '6px', marginRight: '5px' }} onClick={() => handleOpenUserModal(u)}><Edit2 size={14} /></button>
                      <button className="btn btn-ghost" style={{ padding: '6px', color: 'var(--red)' }} onClick={() => handleDeleteUser(u.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ABA DE CONFIGS */}
      {activeTab === 'config' && (
        <div className="cfg-card">
          <div className="cfg-pane active">
            <h4 style={{ marginBottom: '20px' }}>🔌 Integração Global - Evolution API</h4>
            
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

            {/* LISTA DE INSTÂNCIAS (MINI CARDS) */}
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
      )}

      {/* MODAL CLINICA */}
      {isOrgModalOpen && (
        <Modal title={orgForm.id ? <span><Edit2 size={18}/> Editar Clínica</span> : <span><Building2 size={18}/> Cadastrar Nova Clínica</span>} onClose={() => setIsOrgModalOpen(false)}>
          <form onSubmit={handleSaveOrg}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Nome da Clínica</label>
              <input required type="text" value={orgForm.nome} onChange={e => {
                const nome = e.target.value;
                if (!orgForm.id) {
                  // Sugerir instância automaticamente se for nova
                  const suggestedInstance = 'aca-' + nome.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
                  setOrgForm({ ...orgForm, nome, evo_instance: suggestedInstance });
                } else {
                  setOrgForm({ ...orgForm, nome });
                }
              }} style={{ width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }} placeholder="Ex: ACA Matriz" />
            </div>
            <div style={{ marginBottom: '25px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Instância Evolution API</label>
              <input required type="text" value={orgForm.evo_instance} onChange={e => setOrgForm({ ...orgForm, evo_instance: e.target.value })} style={{ width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }} disabled={!!orgForm.id} title={orgForm.id ? "A instância não pode ser alterada após a criação" : ""} placeholder="Ex: aca-franquia-sp" />
              {orgForm.id && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>A instância não pode ser renomeada após criada no Evolution API.</div>}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {orgForm.id ? (
                 <button type="button" className="btn btn-ghost" style={{ border: '1px dashed var(--border)', color: 'var(--accent)' }} onClick={() => openAddUserForOrg(orgForm.id)}>
                    + Adicionar Usuário para esta clínica
                 </button>
              ) : <div></div>}
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsOrgModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loadingState !== ''}>
                  {loadingState === 'salvando_org' ? 'Criando Organização no banco...' : 
                   loadingState === 'salvando_evo' ? 'Criando instância na Evolution...' : 'Salvar'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL USUARIO */}
      {isUserModalOpen && (
        <Modal title={userForm.id ? <span><Edit2 size={18}/> Editar Usuário</span> : <span><Users size={18}/> Cadastrar Novo Admin</span>} onClose={() => setIsUserModalOpen(false)}>
          <form onSubmit={handleSaveUser}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>E-mail</label>
              <input required type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} style={{ width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }} placeholder="admin@clinica.com" />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Senha {userForm.id && '(Deixe em branco para não alterar)'}</label>
              <input required={!userForm.id} type="password" value={userForm.senha} onChange={e => setUserForm({ ...userForm, senha: e.target.value })} style={{ width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }} placeholder="••••••••" />
            </div>
            <div style={{ marginBottom: '25px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Vincular à Clínica</label>
              <select required value={userForm.organization_id} onChange={e => setUserForm({ ...userForm, organization_id: e.target.value })} style={{ width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}>
                <option value="">Selecione a Clínica...</option>
                {clinicas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setIsUserModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loadingState !== ''}>{loadingState === 'salvando_usr' ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
