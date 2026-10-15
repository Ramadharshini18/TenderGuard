import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginRequest, fetchCurrentUser, logoutRequest } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'tenderguard_auth_token';
const REMEMBER_KEY = 'tenderguard_remember_me';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  });
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Validate session on application load or token change
  const verifySession = useCallback(async (activeToken) => {
    if (!activeToken) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetchCurrentUser(activeToken);
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        // Token invalid or expired
        clearStoredAuth();
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      clearStoredAuth();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      verifySession(storedToken);
    } else {
      setIsLoading(false);
    }
  }, [verifySession]);

  const clearStoredAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    setToken(null);
  };

  const login = async (email, password, rememberMe = false) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const response = await loginRequest(email, password, rememberMe);
      if (!response.success) {
        setAuthError(response.error || 'Authentication failed. Please verify credentials.');
        setIsLoading(false);
        return { success: false, error: response.error };
      }

      const receivedToken = response.data.access_token;
      const receivedUser = response.data.user;

      // Save token based on rememberMe preference
      if (rememberMe) {
        localStorage.setItem(TOKEN_KEY, receivedToken);
        localStorage.setItem(REMEMBER_KEY, 'true');
      } else {
        sessionStorage.setItem(TOKEN_KEY, receivedToken);
        localStorage.removeItem(TOKEN_KEY);
      }

      setToken(receivedToken);
      setUser(receivedUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setIsLoading(false);
      return { success: true, user: receivedUser };
    } catch (err) {
      const msg = err.message || 'An unexpected error occurred during login.';
      setAuthError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    const currentToken = token;
    clearStoredAuth();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);

    if (currentToken) {
      try {
        await logoutRequest(currentToken);
      } catch (err) {
        // Ignored on client logout
      }
    }
  };

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    authError,
    login,
    logout,
    clearAuthError: () => setAuthError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
