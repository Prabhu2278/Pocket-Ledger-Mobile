// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Authentication Context
// ---------------------------------------------------------------------------

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage';
import { api, setOnUnauthorizedHandler } from '../services/api';
import { User, TokenResponse } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<TokenResponse>;
  register: (data: { name: string; email: string; password: string }) => Promise<TokenResponse>;
  logout: () => Promise<void>;
  updateProfile: (data: { full_name?: string; currency?: string; theme?: string }) => Promise<User>;
  changePassword: (data: { current_password: string; new_password: string }) => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      await storage.clearAll();
    } catch (err) {
      console.warn('[AuthContext] Error clearing storage during logout:', err);
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  // Hook up 401 interceptor
  useEffect(() => {
    setOnUnauthorizedHandler(() => {
      logout();
    });
  }, [logout]);

  // Initial session restoration from secure storage
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedToken = await storage.getToken();
        const savedUser = await storage.getUser<User>();

        if (savedToken) {
          setToken(savedToken);
          if (savedUser) {
            setUser(savedUser);
          }
          // Validate with server
          try {
            const freshUser = await api.auth.getMe();
            setUser(freshUser);
            await storage.setUser(freshUser);
          } catch (err) {
            console.warn('[Auth] Token validation failed:', err);
          }
        }
      } catch (err) {
        console.warn('[Auth] Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = async (credentials: { email: string; password: string }): Promise<TokenResponse> => {
    const res = await api.auth.login(credentials);
    await storage.setToken(res.access_token);
    await storage.setUser(res.user);
    setToken(res.access_token);
    setUser(res.user);
    return res;
  };

  const register = async (data: { name: string; email: string; password: string }): Promise<TokenResponse> => {
    const res = await api.auth.register(data);
    await storage.setToken(res.access_token);
    await storage.setUser(res.user);
    setToken(res.access_token);
    setUser(res.user);
    return res;
  };

  const updateProfile = async (data: { full_name?: string; currency?: string; theme?: string }): Promise<User> => {
    const updated = await api.auth.updateMe(data);
    setUser(updated);
    await storage.setUser(updated);
    return updated;
  };

  const changePassword = async (data: { current_password: string; new_password: string }): Promise<void> => {
    await api.auth.changePassword(data);
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const freshUser = await api.auth.getMe();
      setUser(freshUser);
      await storage.setUser(freshUser);
      return freshUser;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
