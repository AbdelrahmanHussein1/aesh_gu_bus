import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getInitialApiUrl, normalizeApiUrl } from './api';

export interface MobileUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  token: string;
}

interface AppContextValue {
  serverUrl: string;
  serverUrlError: string | null;
  setServerUrl: (url: string) => void;
  user: MobileUser | null;
  setUser: (user: MobileUser | null) => void;
  signOut: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: React.PropsWithChildren) {
  const [{ serverUrl, serverUrlError }, setServer] = useState(() => {
    try {
      return { serverUrl: getInitialApiUrl(), serverUrlError: null as string | null };
    } catch (error) {
      return {
        serverUrl: '',
        serverUrlError: `EXPO_PUBLIC_API_URL: ${error instanceof Error ? error.message : 'Configure a valid API origin.'}`,
      };
    }
  });
  const [user, setUser] = useState<MobileUser | null>(null);

  const setServerUrl = useCallback((url: string) => {
    setServer({ serverUrl: normalizeApiUrl(url), serverUrlError: null });
  }, []);
  const signOut = useCallback(() => setUser(null), []);
  const value = useMemo(() => ({ serverUrl, serverUrlError, setServerUrl, user, setUser, signOut }), [serverUrl, serverUrlError, setServerUrl, user, signOut]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used inside AppProvider.');
  return context;
}
