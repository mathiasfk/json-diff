import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gtag } from '../services/analytics';
import { Json2ToonCta } from './Json2ToonCta';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n-config';
import { LanguageSelector } from './LanguageSelector';

interface HeaderProps {
  /** When true, hide the FAQ/back nav (e.g. FAQ page renders its own breadcrumb). */
  showNav?: boolean;
  /** When true and showNav is false, render a real internal link back to home. */
  homeLink?: boolean;
}

export function Header({ showNav = true, homeLink = false }: HeaderProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isFaq = location.pathname.endsWith('/faq');
  const currentLanguage: Locale = isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE;

  const getLocalePath = (lng: Locale, target: '' | 'faq') =>
    target === 'faq' ? `/${lng}/faq` : `/${lng}`;

  const changeLanguage = (lng: Locale) => {
    i18n.changeLanguage(lng);
    // Persist the language choice
    localStorage.setItem('i18nextLng', lng);
    gtag('event', 'language_change', { language: lng });
    // Keep the URL in sync with the chosen locale while preserving the route.
    navigate(getLocalePath(lng, isFaq ? 'faq' : ''));
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4" role="banner">
      <div className="max-w-screen-2xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('app.title')}</h1>
          <p className="text-sm text-gray-400 mt-1">
            Compare JSON, YAML and JSONL semantically with smart array matching
          </p>
          <Json2ToonCta />
        </div>
        {showNav ? (
          <nav aria-label="Primary">
            {isFaq ? (
              <button
                onClick={() => {
                  gtag('event', 'faq_back_click');
                  navigate(-1);
                }}
                className="text-sm text-gray-400 hover:text-gray-200"
                aria-label="Go back to previous view"
              >
                ← Back
              </button>
            ) : (
              <Link
                to={getLocalePath(currentLanguage, 'faq')}
                onClick={() => {
                  gtag('event', 'faq_open_click');
                }}
                className="text-sm text-gray-400 hover:text-gray-200"
              >
                FAQ
              </Link>
            )}
            {/* Language selector */}
            <LanguageSelector
              onSelect={changeLanguage}
              className="ml-4"
            />
          </nav>
        ) : homeLink ? (
          <nav aria-label="Primary">
            <Link
              to={getLocalePath(currentLanguage, '')}
              className="text-sm text-gray-400 hover:text-gray-200"
              aria-label="Go to the Smart JSON Diff home page"
            >
              ← Home
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
