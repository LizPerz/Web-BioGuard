import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, TOKEN_KEY } from '../constants';

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const message = error.response?.data?.message || error.message || 'Error de conexión';
    return Promise.reject({ message, status: error.response?.status });
  }
);

export default httpClient;
