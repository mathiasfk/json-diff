// Central i18n configuration for Smart JSON Diff.
// Defines the supported locales, the default/fallback locale, and helpers for
// reading the locale from the URL (we use a `/:locale` path prefix with the
// existing react-router HashRouter).

export const SUPPORTED_LOCALES = ['en', 'pt', 'zh', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

// Native names shown in the language selector.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
  zh: '中文',
  es: 'Español',
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value !== null && value !== undefined && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Determine the initial locale for a fresh session (no persisted choice).
 * Prefers the browser's navigator.language, falling back to DEFAULT_LOCALE.
 * This runs once on app boot; once the user picks a locale it is persisted in
 * localStorage by react-i18next and we then route via the URL prefix.
 */
export function detectInitialLocale(): Locale {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const primary = navigator.language.slice(0, 2).toLowerCase();
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
