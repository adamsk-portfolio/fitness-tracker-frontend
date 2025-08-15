import { createContext, useContext, useState, ReactNode } from 'react';
import api from '@/services/api';

type AuthContextT = {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextT | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token')
  );

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
  };

  const loginWithToken = (t: string) => {
    localStorage.setItem('token', t);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
