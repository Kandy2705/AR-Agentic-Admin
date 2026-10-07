import { createContext, useContext } from 'react';

export type Language = 'vi' | 'en';

export interface I18n {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Translate an English source string; `{name}` placeholders are interpolated. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatDate: (value: string | null | undefined) => string;
  formatNumber: (value: number) => string;
}

export const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>.');
  return context;
}
