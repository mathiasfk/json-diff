import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { gtag } from '../services/analytics';
import { Json2ToonCta } from './Json2ToonCta';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { LOCALE_NAMES, SUPPORTED_LOCALES, DEFAULT_LOCALE, isLocale, type Locale } from '../i18n-config';

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
  const { locale } = useParams<{ locale: string }>();
  const activeLocale: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const isFaq = location.pathname.endsWith('/faq');

  // Build a locale-prefixed path, preserving the current sub-route (/faq).
  const localePath = (target: '' | 'faq') =>
    target === 'faq' ? `/${activeLocale}/faq` : `/${activeLocale}`;

  const changeLanguage = (lng: Locale) => {
    i18n.changeLanguage(lng);
    gtag('event', 'language_change', { language: lng });
    // Keep the URL in sync with the chosen locale while preserving the route.
    navigate(localePath(isFaq ? 'faq' : ''));
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
                to={localePath('faq')}
                onClick={() => {
                  gtag('event', 'faq_open_click');
                }}
                className="text-sm text-gray-400 hover:text-gray-200"
              >
                FAQ
              </Link>
            )}
            {/* Language selector */}
            <div className="flex items-center gap-2 ml-4">
              <select
                value={activeLocale}
                onChange={(e) => changeLanguage(e.target.value as Locale)}
                className="border border-gray-700 bg-gray-900 text-gray-100 rounded px-2 py-1"
                aria-label="Select language"
              >
                {SUPPORTED_LOCALES.map((lng) => (
                  <option key={lng} value={lng}>
                    {LOCALE_NAMES[lng]}
                  </option>
                ))}
              </select>
            </div>
          </nav>
        ) : homeLink ? (
          <nav aria-label="Primary">
            <Link
              to={localePath('')}
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
