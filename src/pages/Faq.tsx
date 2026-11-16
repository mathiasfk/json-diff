import { useEffect, useMemo } from 'react';
import { Header } from '../components/Header';
import { SupportFooter } from '../components/SupportFooter';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { DEFAULT_LOCALE, isLocale } from '../i18n-config';
import support from '../content/support-nav.json';

interface FaqItem {
  q: string;
  a: string;
  examples?: Array<{ left: string; right: string; explanation: string }>;
}

export default function Faq() {
  const { t } = useTranslation();
  const { locale } = useParams<{ locale: string }>();
  const homePath = `/${isLocale(locale) ? locale : DEFAULT_LOCALE}`;
  const exampleLabels = support[isLocale(locale) ? locale : DEFAULT_LOCALE].examples;
  // `returnObjects` yields the localized array of { q, a } items; since every
  // locale carries the same keys, the array is always present in default (en).
  const items: FaqItem[] = useMemo(
    () => t('faq.items', { returnObjects: true }) as FaqItem[],
    [t],
  );

  const faqSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: it.a,
      },
    })),
  }), [items]);

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(faqSchema);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [faqSchema]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header showNav={false} homeLink={true} />
      <main className="max-w-screen-2xl mx-auto p-6" role="main">
        <nav aria-label={t('faq.breadcrumbNav')} className="mb-4">
          <Link to={homePath} className="text-sm text-gray-400 hover:text-gray-200">{t('faq.breadcrumbHome')}</Link>
          <span className="px-2 text-gray-500" aria-hidden="true">/</span>
          <span className="text-sm text-gray-300">{t('faq.breadcrumbFaq')}</span>
        </nav>
        <h2 className="text-2xl font-semibold mb-6">{t('faq.title')}</h2>
        <div className="space-y-6">
          {items.map((item, idx) => (
            <section key={idx} className="bg-gray-800 border border-gray-700 rounded-lg p-5">
              <h3 className="text-lg font-semibold mb-2">{item.q}</h3>
              <p className="text-gray-300">{item.a}</p>
              {item.examples?.map((example, exampleIndex) => (
                <div key={exampleIndex} className="mt-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                    {(['left', 'right'] as const).map(side => (
                      <div key={side} className="min-w-0">
                        <span className="text-sm text-gray-300">{side === 'left' ? exampleLabels.leftLabel : exampleLabels.rightLabel}</span>
                        <pre className="mt-1 p-3 bg-gray-900 border border-gray-700 rounded-md overflow-auto whitespace-pre-wrap wrap-anywhere"><code>{example[side]}</code></pre>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-gray-300">{example.explanation}</p>
                </div>
              ))}
            </section>
          ))}
        </div>
      </main>
      <SupportFooter />
    </div>
  );
}
