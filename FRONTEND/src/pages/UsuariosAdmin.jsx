import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

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

export default function UsuariosAdmin() {
  const { isMaster } = useAuth();
  const [searchParams] = useSearchParams();
  const initialOrgId = searchParams.get('orgId') || '';

  const [usuarios, setUsuarios] = useState([]);
  const [clinicas, setClinicas] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({ id: '', email: '', senha: '', organization_id: initialOrgId });
  const [loadingState, setLoadingState] = useState('');
  const [toast, setToast] = useState({ msg: '', type: '', visible: false });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  useEffect(() => {
    if (isMaster) loadData();
    if (initialOrgId) setIsUserModalOpen(true);
  }, [isMaster, initialOrgId]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('aca_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [resUsr, resOrg] = await Promise.all([
        fetch(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/admin/users`, { headers }),
        fetch(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/admin/organizations`, { headers })
      ]);
      if (resUsr.ok) setUsuarios(await resUsr.json());
      if (resOrg.ok) setClinicas(await resOrg.json());
    } catch (err) {
      console.error(err);
    }
  };

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
        ? `${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/admin/users/${userForm.id}` 
        : `${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/admin/users`;

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
      const res = await fetch(`${import.meta.env.MODE === "production" ? "https://aca-api.dmedia.com.br" : "http://localhost:3000"}/api/admin/users/${id}`, {
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
            <Users size={24} /> Usuários Administradores
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Gerencie o acesso das clínicas</div>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenUserModal()}>
          <Plus size={16} /> Novo Admin
        </button>
      </div>

      <div className="cfg-card">
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
