import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Stethoscope, BadgeDollarSign, Users, Settings, Menu, Shield, Building2, Link as LinkIcon, FileText } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './index.css';

// Componentes/Páginas
import VisaoGeral from './pages/VisaoGeral';
import Limpeza from './pages/Limpeza';
import Orcamentos from './pages/Orcamentos';
import Configuracoes from './pages/Configuracoes';
import Todos from './pages/Todos';
import Campanhas from './pages/Campanhas';
import CampanhaDetalhes from './pages/CampanhaDetalhes';
import Templates from './pages/Templates';
import Login from './pages/Login';
import Clinicas from './pages/Clinicas';
import UsuariosAdmin from './pages/UsuariosAdmin';
import Integracoes from './pages/Integracoes';

function Sidebar({ isOpen }) {
  const { isMaster } = useAuth();
  
  return (
    <div className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
      <div className="sidebar-header" style={{ minWidth: '250px' }}>
        <h1>ACA <span>Dental</span></h1>
      </div>
      <div className="nav-menu" style={{ minWidth: '250px' }}>
        {!isMaster ? (
          <>
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} /> Visão Geral
            </NavLink>
            <NavLink to="/limpeza" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Stethoscope size={18} /> Radar de Limpeza
            </NavLink>
            <NavLink to="/orcamentos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <BadgeDollarSign size={18} /> Orçamentos
            </NavLink>
            <NavLink to="/todos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} /> Todos os Pacientes
            </NavLink>
            <NavLink to="/templates" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileText size={18} /> Modelos de Mensagens
            </NavLink>
            <NavLink to="/campanhas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <BadgeDollarSign size={18} /> Histórico de Campanhas
            </NavLink>
            <NavLink to="/configuracoes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Settings size={18} /> Configurações
            </NavLink>
          </>
        ) : (
          <>
            <div style={{ padding: '10px 20px', fontSize: '11px', fontWeight: 'bold', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Painel SaaS Master
            </div>
            <NavLink to="/admin/clinicas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Building2 size={18} /> Clínicas
            </NavLink>
            <NavLink to="/admin/usuarios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} /> Usuários
            </NavLink>
            <NavLink to="/admin/integracoes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <LinkIcon size={18} /> Integrações
            </NavLink>
            <NavLink to="/configuracoes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Settings size={18} /> Configurações
            </NavLink>
          </>
        )}
      </div>
    </div>
  );
}

function Header({ toggleSidebar }) {
  const { user, logout } = useAuth();
  
  return (
    <div className="hdr">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={toggleSidebar} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <Menu size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-.5px' }}>
            ACA <span style={{ color: 'var(--accent)' }}>Central de Inteligência</span>
          </h1>
          <div className="hdr-sub" style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Orçamentos · Retorno de Pacientes</div>
        </div>
      </div>
      <div className="hdr-right" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{user?.email}</div>
        <div className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(79,142,247,.12)', border: '1px solid rgba(79,142,247,.3)', color: 'var(--accent)', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '500' }}>
          <span className="dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green)' }}></span> 
          {user?.role === 'MASTER' ? 'SaaS Master' : 'Ativo'}
        </div>
        <button onClick={logout} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>Sair</button>
      </div>
    </div>
  );
}

function MainApp() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (isLoginPage) {
    return <Routes><Route path="/login" element={<Login />} /></Routes>;
  }

  return (
    <div className="app-container">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="main-content">
        <Header toggleSidebar={toggleSidebar} />
        <div className="page" style={{ display: 'block' }}>
          <Routes>
            <Route path="/" element={<VisaoGeral />} />
            <Route path="/limpeza" element={<Limpeza />} />
            <Route path="/orcamentos" element={<Orcamentos />} />
            <Route path="/todos" element={<Todos />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/campanhas" element={<Campanhas />} />
            <Route path="/campanhas/:id" element={<CampanhaDetalhes />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            
            <Route path="/admin" element={<Navigate to="/admin/clinicas" replace />} />
            <Route path="/admin/clinicas" element={<Clinicas />} />
            <Route path="/admin/usuarios" element={<UsuariosAdmin />} />
            <Route path="/admin/integracoes" element={<Integracoes />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </Router>
  );
}

export default App;
