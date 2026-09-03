import { io } from 'socket.io-client';
import { getApiBaseUrl } from './apiClient';

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    const baseUrl = getApiBaseUrl();
    socketInstance = io(baseUrl || undefined, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance.id);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });
  }
  return socketInstance;
}
