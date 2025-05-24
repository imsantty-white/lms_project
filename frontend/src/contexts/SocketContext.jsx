import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext'; // Assuming AuthContext provides user info

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth(); // Get user from AuthContext

  useEffect(() => {
    if (user && user._id) { // <-- Cambia de user.id a user._id
      const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000', {
        query: { userId: user._id }, // <-- Cambia aquí también
        transports: ['websocket']
      });
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      // Example: Listen for an event (can be moved later)
      // newSocket.on('new_notification', (notification) => {
      //   console.log('Received new notification:', notification);
      //   // Here you would update unread count, etc.
      // });

      return () => {
        newSocket.disconnect();
        setSocket(null);
      };
    } else if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
