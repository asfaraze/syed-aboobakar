import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sak_token'));
  const [loading, setLoading] = useState(true);

  // Load current user from server on boot
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
          localStorage.removeItem('sak_token');
          setToken(null);
        }
      } catch (err) {
        console.error('Failed to verify session:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = (userData, authToken) => {
    setUser(userData);
    if (authToken) {
      setToken(authToken);
      localStorage.setItem('sak_token', authToken);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {}
    setUser(null);
    setToken(null);
    localStorage.removeItem('sak_token');
  };

  const isOwner = user?.role === 'owner';
  const isStaff = user?.role === 'staff' || user?.role === 'owner';
  const isCustomer = user?.role === 'customer';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isOwner, isStaff, isCustomer }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
