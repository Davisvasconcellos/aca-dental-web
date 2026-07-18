import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Stethoscope, BadgeDollarSign, Users, Settings, Menu } from 'lucide-react';
import './index.css';

// Componentes/Páginas Mockadas
import VisaoGeral from './pages/VisaoGeral';
import Limpeza from './pages/Limpeza';
import Orcamentos from './pages/Orcamentos';
import Configuracoes from './pages/Configuracoes';
import Todos from './pages/Todos';
import Campanhas from './pages/Campanhas';

function Sidebar({ isOpen }) {
  return (
    <div className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
      <div className="sidebar-header" style={{ minWidth: '250px' }}>
        <h1>ACA <span>Dental</span></h1>
      </div>
      <div className="nav-menu" style={{ minWidth: '250px' }}>
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
        <NavLink to="/campanhas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BadgeDollarSign size={18} /> Histórico de Campanhas
        </NavLink>
        <NavLink to="/configuracoes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={18} /> Configurações
        </NavLink>
      </div>
    </div>
  );
}

function Header({ toggleSidebar }) {
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
      <div className="hdr-right" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(79,142,247,.12)', border: '1px solid rgba(79,142,247,.3)', color: 'var(--accent)', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '500' }}>
          <span className="dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green)' }}></span> 
          Ativo
        </div>
      </div>
    </div>
  );
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <Router>
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
              <Route path="/campanhas" element={<Campanhas />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
