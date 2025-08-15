import axios from 'axios';
import type { Goal } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) {
    cfg.headers = cfg.headers ?? {};
    (cfg.headers as any).Authorization = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

export async function fetchGoalsWithProgress(): Promise<Goal[]> {
  const res = await api.get<{ items: Goal[] }>('/goals', {
    params: { with_progress: 'true', page: 1, page_size: 100 },
  });
  return res.data.items ?? [];
}

export async function login(email: string, password: string): Promise<string> {
  const res = await api.post<{ access_token: string }>(
    '/auth/login',
    { email, password },
  );
  return res.data.access_token;
}

export const GOOGLE_LOGIN_URL = '/api/auth/google/login';
