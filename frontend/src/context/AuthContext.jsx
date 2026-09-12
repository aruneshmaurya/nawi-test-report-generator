import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('nawi_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nawi_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user details from /api/auth/me on mount or token change
  const fetchCurrentUser = useCallback(async () => {
    const currentToken = localStorage.getItem('nawi_token');
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.get('/auth/me');
      if (response.data?.success && response.data?.data?.user) {
        const userData = response.data.data.user;
        setUser(userData);
        localStorage.setItem('nawi_user', JSON.stringify(userData));
      }
    } catch (err) {
      console.error('[AUTH HYDRATION ERROR]', err?.response?.data?.message || err.message);
      // If token expired/invalid, clear auth state
      if (err?.response?.status === 401) {
        localStorage.removeItem('nawi_token');
        localStorage.removeItem('nawi_user');
        setToken(null);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Login handler
  const login = async (email, password, lab_id) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/login', {
        email: email.trim(),
        password,
        lab_id,
      });

      if (res.data?.success && res.data?.data?.token) {
        const receivedToken = res.data.data.token;
        const receivedUser = res.data.data.user;

        localStorage.setItem('nawi_token', receivedToken);
        localStorage.setItem('nawi_user', JSON.stringify(receivedUser));

        setToken(receivedToken);
        setUser(receivedUser);

        // Fetch full profile with lab name
        await fetchCurrentUser();

        return { success: true, user: receivedUser };
      }
      throw new Error(res.data?.message || 'Login failed');
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Login failed. Please check credentials.';
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('nawi_token');
    localStorage.removeItem('nawi_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
    refreshUser: fetchCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
