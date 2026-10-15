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
  setServerUrl: (url: string) => void;
  user: MobileUser | null;
  setUser: (user: MobileUser | null) => void;
  signOut: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: React.PropsWithChildren) {
  const [serverUrl, setServerUrlState] = useState(getInitialApiUrl);
  const [user, setUser] = useState<MobileUser | null>(null);

  const setServerUrl = useCallback((url: string) => {
    setServerUrlState(normalizeApiUrl(url));
  }, []);
  const signOut = useCallback(() => setUser(null), []);
  const value = useMemo(() => ({ serverUrl, setServerUrl, user, setUser, signOut }), [serverUrl, setServerUrl, user, signOut]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used inside AppProvider.');
  return context;
}
