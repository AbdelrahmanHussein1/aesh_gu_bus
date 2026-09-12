'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, Locale, TranslationKey } from './translations';

interface LanguageContextType {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');

  useEffect(() => {
    const stored = localStorage.getItem('aesh_locale') as Locale | null;
    const initialLocale: Locale = stored === 'en' ? 'en' : 'ar';
    setLocaleState(initialLocale);
    applyHtmlLocale(initialLocale);
  }, []);

  const applyHtmlLocale = (l: Locale) => {
    const html = document.documentElement;
    html.lang = l;
    html.dir = l === 'ar' ? 'rtl' : 'ltr';
  };

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('aesh_locale', newLocale);
    applyHtmlLocale(newLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    const next: Locale = locale === 'ar' ? 'en' : 'ar';
    setLocale(next);
  }, [locale, setLocale]);

  const t = useCallback((key: TranslationKey, fallback?: string): string => {
    const dict = translations[locale];
    if (dict && key in dict) {
      return (dict as any)[key];
    }
    return fallback || key;
  }, [locale]);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ locale, dir, setLocale, toggleLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
