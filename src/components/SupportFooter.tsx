import { useTranslation } from 'react-i18next';
import { DEFAULT_LOCALE, isLocale } from '../i18n-config';
import support from '../content/support.json';

export function SupportFooter() {
  const { i18n } = useTranslation();
  const locale = isLocale(i18n?.resolvedLanguage) ? i18n?.resolvedLanguage : DEFAULT_LOCALE;
  const content = support[locale];
  return <footer className="max-w-screen-2xl mx-auto px-6 pb-5 text-sm text-gray-400">
    <nav aria-label={content.nav} className="flex flex-wrap justify-center gap-x-5 gap-y-2">
      {(['faq', 'how-it-works', 'privacy', 'contact'] as const).map(page =>
        <a key={page} href={`${import.meta.env.BASE_URL}${locale}/${page}/`} className="underline underline-offset-4 hover:text-gray-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300">{content[page]}</a>)}
    </nav>
  </footer>;
}
