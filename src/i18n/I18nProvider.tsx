import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nContext, type I18n, type Language } from './context';
import { vi } from './vi';

const STORAGE_KEY = 'agentic-admin-language';

function initialLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi';
  }
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** English source strings are the keys; Vietnamese is looked up from the dictionary. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((value: Language) => {
    setLanguageState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* preference is optional */
    }
  }, []);

  const value = useMemo<I18n>(() => {
    const intlLocale = language === 'vi' ? 'vi-VN' : 'en-GB';
    const dateFormat = new Intl.DateTimeFormat(intlLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const numberFormat = new Intl.NumberFormat(intlLocale);
    return {
      language,
      setLanguage,
      t: (key, vars) => interpolate(language === 'vi' ? (vi[key] ?? key) : key, vars),
      formatDate: (input) => {
        if (!input) return '—';
        const date = new Date(input);
        return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date);
      },
      formatNumber: (input) => (Number.isFinite(input) ? numberFormat.format(input) : '—'),
    };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
