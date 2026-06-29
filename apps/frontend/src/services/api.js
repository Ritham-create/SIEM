import axios from 'axios';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://siem-backend-4io0.onrender.com').replace(/\/$/, '');

const api = axios.create({
  baseURL: `${apiBaseUrl}/api/v1`,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Add request interceptor to append JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('siem_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    // If unauthorised, we could redirect or handle it, but store handles checkAuth
    return Promise.reject(error);
  }
);

export default api;
