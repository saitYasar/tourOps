'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { locales, type Locale, type Translations } from '@/locales';

const LANGUAGE_STORAGE_KEY = 'tourops_language';
const DEFAULT_LOCALE: Locale = 'tr';

interface LanguageContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start with default locale to match SSR — prevents hydration mismatch
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Read saved locale AFTER hydration
  useEffect(() => {
    const savedLocale = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Locale | null;
    if (savedLocale && locales[savedLocale] && savedLocale !== DEFAULT_LOCALE) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
    }
  }, []);

  const t = locales[locale];

  return (
    <LanguageContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Shorthand hook for translations only
export function useTranslations() {
  const { t } = useLanguage();
  return t;
}
