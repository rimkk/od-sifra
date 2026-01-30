import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = __DEV__ 
  ? 'http://localhost:3000' 
  : 'https://api.odsifra.com';

let socket: Socket | null = null;

export const initializeSocket = async (): Promise<Socket | null> => {
  const token = await SecureStore.getItemAsync('od_sifra_token');
  
  if (!token) {
    console.log('No token found, cannot initialize socket');
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Message events
export const sendMessage = (receiverId: string, content: string) => {
  socket?.emit('send_message', { receiverId, content });
};

export const sendTyping = (receiverId: string) => {
  socket?.emit('typing', { receiverId });
};

export const sendStopTyping = (receiverId: string) => {
  socket?.emit('stop_typing', { receiverId });
};

export const markMessageRead = (messageId: string) => {
  socket?.emit('mark_read', { messageId });
};

// Event listeners
export const onNewMessage = (callback: (message: any) => void) => {
  socket?.on('new_message', callback);
  return () => socket?.off('new_message', callback);
};

export const onMessageSent = (callback: (message: any) => void) => {
  socket?.on('message_sent', callback);
  return () => socket?.off('message_sent', callback);
};

export const onUserTyping = (callback: (data: { userId: string }) => void) => {
  socket?.on('user_typing', callback);
  return () => socket?.off('user_typing', callback);
};

export const onUserStopTyping = (callback: (data: { userId: string }) => void) => {
  socket?.on('user_stop_typing', callback);
  return () => socket?.off('user_stop_typing', callback);
};

export const onMessageRead = (callback: (data: { messageId: string; readAt: string }) => void) => {
  socket?.on('message_read', callback);
  return () => socket?.off('message_read', callback);
};
