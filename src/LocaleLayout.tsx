import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import i18n from './i18n';
import { localeFromPath, updateHead } from './site';

export function LocaleLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const locale = localeFromPath(pathname);
  useEffect(() => {
    updateHead(locale);
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
  }, [locale]);
  return <>{children}</>;
}
