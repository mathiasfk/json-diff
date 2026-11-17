import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LOCALE, isLocale } from '../i18n-config';
import { homePath } from '../site';
import { LOCALE_NAMES, SUPPORTED_LOCALES } from '../i18n-config';
import support from '../content/support-nav.json';

export function SupportFooter() {
  const { i18n } = useTranslation();
  const locale = isLocale(i18n?.resolvedLanguage) ? i18n?.resolvedLanguage : DEFAULT_LOCALE;
  const content = support[locale];
  return <footer className="max-w-screen-2xl mx-auto px-6 pb-5 text-sm text-gray-400">
    <nav aria-label={content.nav} className="flex flex-wrap justify-center gap-x-5 gap-y-2">
      {(['faq', 'how-it-works', 'privacy', 'contact'] as const).map(page =>
        <a key={page} href={`${import.meta.env.BASE_URL}${locale}/${page}/`} className="underline underline-offset-4 hover:text-gray-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300">{content[page]}</a>)}
    </nav>
    <nav aria-label={content.languages} className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4">
      {SUPPORTED_LOCALES.map(language => <Link key={language} to={homePath(language)} state={{ jsonDiffComparison: Boolean(window.history.state?.jsonDiffComparison || window.history.state?.usr?.jsonDiffComparison) }} lang={language}>{LOCALE_NAMES[language]}</Link>)}
    </nav>
  </footer>;
}
