import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem('aca_user');
    const storedToken = localStorage.getItem('aca_token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, senha) => {
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });
      const data = await res.json();
      
      if (data.ok) {
        localStorage.setItem('aca_token', data.token);
        localStorage.setItem('aca_user', JSON.stringify(data.user));
        setUser(data.user);
        
        if (data.user.role === 'MASTER') {
          navigate('/admin');
        } else {
          navigate('/');
        }
        return { ok: true };
      } else {
        return { ok: false, msg: data.msg };
      }
    } catch (err) {
      return { ok: false, msg: 'Erro de conexão com o servidor' };
    }
  };

  const logout = () => {
    localStorage.removeItem('aca_token');
    localStorage.removeItem('aca_user');
    setUser(null);
    navigate('/login');
  };

  const isMaster = user?.role === 'MASTER';
  const isAdmin = user?.role === 'ADMIN';

  // Proteção de rotas
  useEffect(() => {
    if (!loading) {
      if (!user && location.pathname !== '/login') {
        navigate('/login');
      }
      if (user && location.pathname === '/admin' && !isMaster) {
        navigate('/'); // Usuário comum tentando acessar admin
      }
    }
  }, [user, loading, location.pathname, navigate, isMaster]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isMaster, isAdmin }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
