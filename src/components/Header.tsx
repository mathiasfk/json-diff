import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gtag } from '../services/analytics';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n-config';
import { useTheme } from '../theme';
import { LanguageSelector } from './LanguageSelector';

interface HeaderProps {
  /** When true, hide the FAQ/back nav (e.g. FAQ page renders its own breadcrumb). */
  showNav?: boolean;
  /** When true and showNav is false, render a real internal link back to home. */
  homeLink?: boolean;
}

export function Header({ showNav = true, homeLink = false }: HeaderProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isFaq = location.pathname.endsWith('/faq');
  const currentLanguage: Locale = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : DEFAULT_LOCALE;

  const getLocalePath = (lng: Locale, target: '' | 'faq') =>
    target === 'faq' ? `/${lng}/faq` : `/${lng}`;

  const changeLanguage = (lng: Locale) => {
    i18n.changeLanguage(lng);
    // Persist the language choice
    try { localStorage.setItem('i18nextLng', lng); } catch { /* Storage may be unavailable. */ }
    gtag('event', 'language_change', { language: lng });
    // Keep the URL in sync with the chosen locale while preserving the route.
    navigate(getLocalePath(lng, isFaq ? 'faq' : ''));
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-4 sm:px-6 py-3" role="banner">
      <div className="max-w-screen-2xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t('app.title')}</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            {t('header.subtitle')}
          </p>
        </div>
        {showNav ? (
          <nav aria-label={t('header.primaryNav')} className="flex flex-col items-center gap-2 md:flex-row md:items-center md:gap-4">
            {isFaq && (
              <button
                onClick={() => {
                  gtag('event', 'faq_back_click');
                  navigate(-1);
                }}
                className="text-sm text-gray-400 hover:text-gray-200"
                aria-label={t('header.backAria')}
              >
                ← {t('header.back')}
              </button>
            )}
            <button type="button" onClick={toggleTheme} className="theme-toggle" aria-label={t(theme === 'dark' ? 'theme.switchLight' : 'theme.switchDark')} title={t(theme === 'dark' ? 'theme.switchLight' : 'theme.switchDark')}>
              <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span><span>{t(theme === 'dark' ? 'theme.light' : 'theme.dark')}</span>
            </button>
            <LanguageSelector
              currentLocale={currentLanguage}
              onSelect={changeLanguage}
            />
          </nav>
        ) : homeLink ? (
          <nav aria-label={t('header.primaryNav')} className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to={getLocalePath(currentLanguage, '')}
              className="text-sm text-gray-400 hover:text-gray-200"
              aria-label={t('header.homeAria')}
            >
              ← {t('header.home')}
            </Link>
            <button type="button" onClick={toggleTheme} className="theme-toggle" aria-label={t(theme === 'dark' ? 'theme.switchLight' : 'theme.switchDark')} title={t(theme === 'dark' ? 'theme.switchLight' : 'theme.switchDark')}><span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span><span>{t(theme === 'dark' ? 'theme.light' : 'theme.dark')}</span></button>
            <LanguageSelector currentLocale={currentLanguage} onSelect={changeLanguage} />
          </nav>
        ) : null}
      </div>
    </header>
  );
}
