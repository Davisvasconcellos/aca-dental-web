import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Plus, Edit2, Trash2, Link as LinkIcon, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function Clinicas() {
  const { isMaster } = useAuth();
  const navigate = useNavigate();
  const [clinicas, setClinicas] = useState([]);
  const [usuarios, setUsuarios] = useState([]); // para contar os admins
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [orgForm, setOrgForm] = useState({ id: '', nome: '', evo_instance: '' });
  
  // Modal de Exclusão
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState(null);

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
      const headers = { 'Authorization': `Bearer ${token}` };
      const [resOrg, resUsr] = await Promise.all([
        fetch(`https://api-aca.dmedia.com.br/api/admin/organizations`, { headers }),
        fetch(`https://api-aca.dmedia.com.br/api/admin/users`, { headers })
      ]);
      if (resOrg.ok) setClinicas(await resOrg.json());
      if (resUsr.ok) setUsuarios(await resUsr.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenOrgModal = (org = null) => {
    if (org) setOrgForm(org);
    else setOrgForm({ id: '', nome: '', evo_instance: '' });
    setIsOrgModalOpen(true);
  };

  const handleSaveOrg = async (e) => {
    e.preventDefault();
    setLoadingState('salvando_org');
    try {
      const token = localStorage.getItem('aca_token');
      const isEditing = !!orgForm.id;
      const url = isEditing 
        ? `https://api-aca.dmedia.com.br/api/admin/organizations/${orgForm.id}` 
        : `https://api-aca.dmedia.com.br/api/admin/organizations`;

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
        const evoRes = await fetch(`https://api-aca.dmedia.com.br/api/admin/organizations/${data.org.id}/create-instance`, {
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

  const openDeleteModal = (org) => {
    setOrgToDelete(org);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteOrg = async () => {
    if (!orgToDelete) return;
    setLoadingState('excluindo');
    try {
      const token = localStorage.getItem('aca_token');
      const res = await fetch(`https://api-aca.dmedia.com.br/api/admin/organizations/${orgToDelete.id}`, {
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
    setIsDeleteModalOpen(false);
    setOrgToDelete(null);
    setLoadingState('');
  };

  const openAddUserForOrg = (orgId) => {
    setIsOrgModalOpen(false);
    navigate(`/admin/usuarios?orgId=${orgId}`);
  };

  if (!isMaster) return null;

  return (
    <div style={{ padding: '20px', position: 'relative' }}>
      {toast.visible && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 99999, background: toast.type === 'error' ? 'var(--red)' : 'var(--green)', color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.3s ease' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={24} /> Clínicas (Organizations)
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Gerencie as organizações que utilizam a plataforma SaaS</div>
        </div>
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
                  <button className="btn btn-ghost" style={{ padding: '6px', color: 'var(--red)' }} onClick={() => openDeleteModal(c)} title="Excluir"><Trash2 size={14} /></button>
                </div>
              </div>
              
              <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Users size={14} /> {adminsCount} Admin(s)
                </div>
                <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px', border: '1px solid var(--border)' }} onClick={() => openAddUserForOrg(c.id)}>
                  + Adicionar Usuário
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isOrgModalOpen && (
        <Modal title={orgForm.id ? <span><Edit2 size={18}/> Editar Clínica</span> : <span><Building2 size={18}/> Cadastrar Nova Clínica</span>} onClose={() => setIsOrgModalOpen(false)}>
          <form onSubmit={handleSaveOrg}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '5px' }}>Nome da Clínica</label>
              <input required type="text" value={orgForm.nome} onChange={e => {
                const nome = e.target.value;
                if (!orgForm.id) {
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
                    + Adicionar Usuário
                 </button>
              ) : <div></div>}
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsOrgModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loadingState !== ''}>
                  {loadingState === 'salvando_org' ? 'Criando Organização...' : 
                   loadingState === 'salvando_evo' ? 'Criando instância Evolution...' : 'Salvar'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {isDeleteModalOpen && orgToDelete && (
        <Modal title={<span>⚠️ Confirmar Exclusão</span>} onClose={() => setIsDeleteModalOpen(false)}>
          <div style={{ color: 'var(--text)', marginBottom: '20px' }}>
            <p>Você está prestes a excluir a clínica <strong>{orgToDelete.nome}</strong>.</p>
            <p style={{ color: 'var(--red)', fontSize: '13px', marginTop: '10px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px' }}>
              <strong>Atenção:</strong> Esta ação apagará TODOS os dados, pacientes, orçamentos e usuários vinculados a esta clínica de forma permanente.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" style={{ background: 'var(--red)', borderColor: 'var(--red)' }} onClick={handleDeleteOrg} disabled={loadingState === 'excluindo'}>
              {loadingState === 'excluindo' ? 'Excluindo...' : 'Sim, excluir clínica'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
