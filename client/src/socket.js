import { io } from 'socket.io-client';

// одно подключение на всё приложение; открывается после входа
export const socket = io(import.meta.env.VITE_API_URL, { autoConnect: false });

export function connectSocket() {
  socket.auth = { token: localStorage.getItem('token') };
  socket.connect();
}

export function disconnectSocket() {
  socket.disconnect();
}
