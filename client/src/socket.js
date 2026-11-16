import { io } from 'socket.io-client';

export const socket = io(import.meta.env.VITE_API_URL, { autoConnect: false });

export function connectSocket() {
  socket.auth = { token: localStorage.getItem('token') };
  socket.connect();
}

export function disconnectSocket() {
  socket.disconnect();
}
