import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ems-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Token expired / revoked → force re-login
    if (err.response?.status === 401 && !err.config.url?.includes('/auth/login')) {
      localStorage.removeItem('ems-token');
      localStorage.removeItem('ems-user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const errorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.message;
  }
  return 'Something went wrong';
};

export default api;
