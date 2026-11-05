import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { api, setToken, getToken } from './api';

const Ctx = createContext();
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false), [msg, setMsg] = useState('');
  const toast = useCallback(m => { setMsg(m); setTimeout(() => setMsg(''), 3200); }, []);
  useEffect(() => {
    if (!getToken()) return setReady(true);
    api('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);
  const enter = ({ token, user }) => { setToken(token); setUser(user); return user; };
  const login = async b => enter(await api('/auth/login', { method: 'POST', body: b }));
  const register = async b => enter(await api('/auth/register', { method: 'POST', body: b }));
  const logout = () => { setToken(null); setUser(null); };
  if (!ready) return null;
  return <Ctx.Provider value={{ user, setUser, login, register, logout, toast }}>{children}{msg && <div id="toast">{msg}</div>}</Ctx.Provider>;
}

// Chặn truy cập khi chưa đăng nhập hoặc sai vai trò
export const Guard = ({ role, children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
};
