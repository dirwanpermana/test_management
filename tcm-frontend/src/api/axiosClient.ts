import axios from 'axios';

export const axiosClient = axios.create({
  // baseURL: '/api', // contoh awal
  baseURL: 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('tcm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tcm_token');
      localStorage.removeItem('tcm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
