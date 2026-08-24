import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import i18n from './i18n';
import { DEFAULT_LOCALE, isLocale, type Locale } from './i18n-config';

interface LocaleLayoutProps {
  children: React.ReactNode;
}

/**
 * Wraps every locale-prefixed route (`/:locale/...`).
 *
 * Responsibilities:
 * - Validates the `:locale` URL segment; invalid locales redirect to the
 *   default-locale route (preserving the rest of the path).
 * - Keeps react-i18next in sync with the URL: when the locale segment changes
 *   we switch the active language. This makes the URL the single source of
 *   truth for the active locale while keeping localStorage persistence working.
 */
export function LocaleLayout({ children }: LocaleLayoutProps) {
  const { locale } = useParams<{ locale: string }>();
  const validLocale = isLocale(locale) ? locale : null;

  useEffect(() => {
    if (validLocale && i18n.language !== validLocale) {
      // changeLanguage is idempotent if already set; no analytics event here
      // (the language selector in Header owns that signal).
      void i18n.changeLanguage(validLocale as Locale);
    }
  }, [validLocale]);

  if (!validLocale) {
    return <Navigate to={`/${DEFAULT_LOCALE}`} replace />;
  }

  return <>{children}</>;
}
