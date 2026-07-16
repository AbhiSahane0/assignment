import { createContext, useContext, useState, ReactNode } from 'react';
import api from '../api/client';
import { Employee } from '../types';

interface AuthContextValue {
  user: Employee | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Employee) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(() => {
    const saved = localStorage.getItem('ems-user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('ems-token', res.data.token);
    localStorage.setItem('ems-user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('ems-token');
      localStorage.removeItem('ems-user');
      setUser(null);
    }
  };

  const updateUser = (u: Employee) => {
    localStorage.setItem('ems-user', JSON.stringify(u));
    setUser(u);
  };

  return <AuthContext.Provider value={{ user, login, logout, updateUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
