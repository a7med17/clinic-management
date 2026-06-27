// AuthContext coordinates session restore, login/logout state, and unauthorized-session resets.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  LoginResponse,
  User,
  login as loginRequest,
  logout as logoutRequest,
  validateCurrentSession,
} from '../services/authService';
import { StoredSession, clearSession, getSession, subscribeToSessionChanges } from '../services/sessionStorage';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const sessionToUser = (session: StoredSession | null): User | null => session?.user ?? null;
const sessionToToken = (session: StoredSession | null): string | null => session?.accessToken ?? null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const restoreSession = useCallback(async () => {
    setIsRestoring(true);
    try {
      const storedSession = await getSession();
      if (!storedSession) {
        setSession(null);
        return;
      }

      setSession(storedSession);
      const validatedUser = await validateCurrentSession();
      if (!validatedUser) {
        setSession(null);
        return;
      }

      setSession((await getSession()) ?? storedSession);
    } catch (error) {
      console.warn('[AuthContext] Unable to restore session:', error);
      await clearSession();
      setSession(null);
    } finally {
      setIsRestoring(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSessionChanges((nextSession) => {
      setSession(nextSession);
    });

    restoreSession();
    return unsubscribe;
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    if (response.success && response.token && response.user) {
      setSession({ accessToken: response.token, user: response.user });
    }
    return response;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: sessionToUser(session),
    token: sessionToToken(session),
    isAuthenticated: Boolean(session?.accessToken),
    isRestoring,
    login,
    logout,
    restoreSession,
  }), [isRestoring, login, logout, restoreSession, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
