import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface Notification {
  id: number;
  message: string;
  timestamp: Date;
}

interface SocketContextType {
  socket: Socket | null;
  notifications: Notification[];
  clearNotification: (id: number) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  notifications: [],
  clearNotification: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

let notifId = 0;

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;

    const s = io(window.location.origin, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    });

    s.on('notification', (data: { userId: string; message: string }) => {
      if (data.userId === user.id) {
        const id = ++notifId;
        setNotifications((prev) => [
          ...prev,
          { id, message: data.message, timestamp: new Date() },
        ]);
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 5000);
      }
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [user]);

  const clearNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, clearNotification }}>
      {children}
      {notifications.map((n) => (
        <div key={n.id} className="notification-toast" onClick={() => clearNotification(n.id)}>
          {n.message}
        </div>
      ))}
    </SocketContext.Provider>
  );
}
