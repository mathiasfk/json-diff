import { Link, useLocation, useNavigate } from 'react-router-dom';
import { gtag } from '../services/analytics';
import { Json2ToonCta } from './Json2ToonCta';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

interface HeaderProps {
  /** When true, hide the FAQ/back nav (e.g. FAQ page renders its own breadcrumb). */
  showNav?: boolean;
  /** When true and showNav is false, render a real internal link back to home. */
  homeLink?: boolean;
}

export function Header({ showNav = true, homeLink = false }: HeaderProps) {
  const { t, i18n: i18nInstance } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isFaq = location.pathname === '/faq';

  const changeLanguage = (lng: string) => {
    i18nInstance.changeLanguage(lng);
    gtag('event', 'language_change', { language: lng });
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
                to="/faq"
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
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="border border-gray-700 bg-gray-900 text-gray-100 rounded px-2 py-1"
              >
                <option value="en">English</option>
                <option value="pt">Português</option>
                <option value="zh">中文</option>
                <option value="es">Español</option>
              </select>
            </div>
          </nav>
        ) : homeLink ? (
          <nav aria-label="Primary">
            <Link
              to="/"
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
