import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toasts, setToasts] = useState([]);
  const audioContextRef = useRef(null);

  // Play a pleasant chime for seller new order alerts
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio play restricted or unsupported');
    }
  };

  // Add toast helper
  const addToast = (title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Fetch initial notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Connect to SSE stream
  useEffect(() => {
    const eventSource = new EventSource('/api/notifications/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') return;

        // If it's a new order and user is seller, play chime
        if (data.type === 'order_placed' && (user?.role === 'staff' || user?.role === 'owner')) {
          playChime();
        }

        addToast(data.title, data.message, data.type === 'order_placed' ? 'success' : 'info');
        setNotifications(prev => [data, ...prev]);
        setUnreadCount(prev => prev + 1);
      } catch (err) {}
    };

    return () => {
      eventSource.close();
    };
  }, [user, soundEnabled]);

  const markAsRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {}
  };

  // Browser Push Notifications Permission
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications');
      return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        soundEnabled,
        setSoundEnabled,
        markAsRead,
        markAllAsRead,
        requestPushPermission,
        addToast
      }}
    >
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-start space-x-3 max-w-sm animate-bounce-in"
          >
            <div className="flex-1">
              <p className="font-semibold text-sm text-brand-300">{toast.title}</p>
              <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
