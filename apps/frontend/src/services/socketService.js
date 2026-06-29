import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      const socketUrl = (import.meta.env.VITE_API_BASE_URL || 'https://siem-backend-4io0.onrender.com').replace(/\/$/, '');
      this.socket = io(socketUrl, {
        path: '/ws',
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: Infinity
      });

      this.socket.on('connect', () => {
        console.log('✅ SIEM Real-time feed connected:', this.socket.id);
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('⚠️ SIEM feed disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // ── Alerts ──────────────────────────────────────
  subscribeToAlerts(callback) {
    if (this.socket) {
      this.socket.off('newAlert'); // prevent double-registration
      this.socket.on('newAlert', callback);
    }
  }

  unsubscribeFromAlerts() {
    if (this.socket) {
      this.socket.off('newAlert');
    }
  }

  // ── Real-time Log Stream ─────────────────────────
  subscribeToLogs(callback) {
    if (this.socket) {
      this.socket.off('newLog'); // prevent double-registration
      this.socket.on('newLog', callback);
    }
  }

  unsubscribeFromLogs() {
    if (this.socket) {
      this.socket.off('newLog');
    }
  }
}

export default new SocketService();
