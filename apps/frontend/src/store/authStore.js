import { create } from 'zustand';
import api from '../services/api';
import socketService from '../services/socketService';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('siem_token') || null,
  isAuthenticated: false,
  loading: true,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('siem_token', token);
        set({ token, user, isAuthenticated: true, error: null });
        
        // Reconnect socket service
        socketService.connect();
        return true;
      }
      return false;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Login failed. Please verify credentials.';
      set({ error: errorMsg });
      console.error('Login error:', errorMsg);
      return false;
    } finally {
      set({ loading: false });
    }
  },

  register: async (username, email, password, role) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/register', { username, email, password, role });
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('siem_token', token);
        set({ token, user, isAuthenticated: true, error: null });
        
        // Reconnect socket service
        socketService.connect();
        return true;
      }
      return false;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Registration failed.';
      set({ error: errorMsg });
      console.error('Registration error:', error);
      return false;
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('siem_token');
    set({ token: null, user: null, isAuthenticated: false, error: null });
    
    // Disconnect socket connection
    socketService.disconnect();
  },

  checkAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ isAuthenticated: false, loading: false });
      return;
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        set({ user: response.data.user, isAuthenticated: true });
        
        // Connect socket
        socketService.connect();
      } else {
        get().logout();
      }
    } catch (error) {
      console.error('Check auth error:', error.message);
      get().logout();
    } finally {
      set({ loading: false });
    }
  }
}));
