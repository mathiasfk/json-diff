import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gtag } from '../services/analytics';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n-config';
import { homePath } from '../site';
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
    target === 'faq' ? `/${lng}/faq/` : homePath(lng);

  const changeLanguage = (lng: Locale) => {
    i18n.changeLanguage(lng);
    // Persist the language choice
    try { localStorage.setItem('i18nextLng', lng); } catch { /* Storage may be unavailable. */ }
    gtag('event', 'language_change', { language: lng });
    // Keep the URL in sync with the chosen locale while preserving the route.
    navigate(getLocalePath(lng, isFaq ? 'faq' : ''), { state: { jsonDiffComparison: Boolean(window.history.state?.jsonDiffComparison || window.history.state?.usr?.jsonDiffComparison) } });
  };

  return (
    <header className="site-header" role="banner">
      <div className="site-header-inner">
        <div>
          <h1 className="site-title">{t('app.title')}</h1>
          <p className="site-subtitle">
            {t('header.subtitle')}
          </p>
        </div>
        {showNav ? (
          <nav aria-label={t('header.primaryNav')} className="site-header-actions">
            {isFaq && (
              <button
                onClick={() => {
                  gtag('event', 'faq_back_click');
                  navigate(-1);
                }}
                className="site-home"
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
          <nav aria-label={t('header.primaryNav')} className="site-header-actions">
            <Link
              to={getLocalePath(currentLanguage, '')}
              className="site-home"
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
