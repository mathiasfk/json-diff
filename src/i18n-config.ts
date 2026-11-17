// Shared locale configuration. The URL determines the active language.
import site from './content/site.json';

export const SUPPORTED_LOCALES = site.locales as ['en', 'pt', 'zh', 'es'];
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

// Native names shown in the language selector.
export const LOCALE_NAMES: Record<Locale, string> = site.names;

export function isLocale(value: string | undefined | null): value is Locale {
  return value !== null && value !== undefined && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function detectInitialLocale(): Locale {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const primary = navigator.language.slice(0, 2).toLowerCase();
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
