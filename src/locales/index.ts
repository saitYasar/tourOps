import { tr } from './tr';
import { en } from './en';
import { de } from './de';

export type Locale = 'tr' | 'en' | 'de';

export const locales = { tr, en, de };

export type Translations = typeof tr;

export const localeNames: Record<Locale, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
};

export const localeFlags: Record<Locale, string> = {
  tr: '🇹🇷',
  en: '🇬🇧',
  de: '🇩🇪',
};

export { tr, en, de };
