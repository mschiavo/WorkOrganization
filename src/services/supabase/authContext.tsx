import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import { localCache, StorageIdentity, extractProjectRef } from '../storage/localCache';

export interface AuthContextType {
  user: User | { id: string; email: string } | null;
  session: Session | null;
  isGuest: boolean;
  isConfigured: boolean;
  loading: boolean;
  activeIdentity?: StorageIdentity;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const GUEST_STORAGE_KEY = 'workorganizer_is_guest_session';

export const GUEST_USER = {
  id: 'guest-user',
  email: 'guest@workorganizer.local',
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | { id: string; email: string } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GUEST_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [configured, setConfigured] = useState<boolean>(() => isSupabaseConfigured());

  const activeIdentity: StorageIdentity = React.useMemo(() => {
    if (user && !isGuest && user.id !== GUEST_USER.id) {
      const config = localCache.getSupabaseConfig();
      const projectRef = extractProjectRef(config?.url || (import.meta.env.VITE_SUPABASE_URL as string));
      return { scope: 'cloud', userId: user.id, projectRef };
    }
    return { scope: 'guest' };
  }, [user, isGuest]);

  useEffect(() => {
    localCache.setActiveIdentity(activeIdentity);
  }, [activeIdentity]);

  useEffect(() => {
    const isConf = isSupabaseConfigured();
    setConfigured(isConf);

    if (!isConf) {
      // If not configured, auto-enable guest mode or respect existing guest flag
      if (isGuest || localStorage.getItem(GUEST_STORAGE_KEY) === 'true') {
        setUser(GUEST_USER);
        setIsGuest(true);
      }
      setLoading(false);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }

    // Check active session
    client.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        setIsGuest(false);
        try {
          localStorage.removeItem(GUEST_STORAGE_KEY);
        } catch {
          // ignore
        }
      } else if (isGuest) {
        setUser(GUEST_USER);
      }
      setLoading(false);
    }).catch(() => {
      if (isGuest) setUser(GUEST_USER);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setUser(newSession.user);
        setIsGuest(false);
        try {
          localStorage.removeItem(GUEST_STORAGE_KEY);
        } catch {
          // ignore
        }
      } else if (!isGuest) {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isGuest]);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const client = getSupabaseClient();
    if (!client) {
      return { error: new Error('Supabase is not configured.') };
    }

    setLoading(true);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (!error) {
      setIsGuest(false);
      try {
        localStorage.removeItem(GUEST_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    setLoading(false);
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const client = getSupabaseClient();
    if (!client) {
      return { error: new Error('Supabase is not configured.') };
    }

    setLoading(true);
    const { error } = await client.auth.signUp({ email, password });
    setLoading(false);
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut().catch(() => {});
    }
    if (isGuest) {
      localCache.clearUserData({ scope: 'guest' });
    }
    setUser(null);
    setSession(null);
    setIsGuest(false);
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const continueAsGuest = (): void => {
    setIsGuest(true);
    setUser(GUEST_USER);
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isGuest,
        isConfigured: configured,
        loading,
        activeIdentity,
        signIn,
        signUp,
        signOut,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
