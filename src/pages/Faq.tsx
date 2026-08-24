import { useEffect, useMemo } from 'react';
import { Header } from '../components/Header';
import { useTranslation } from 'react-i18next';

interface FaqItem {
  q: string;
  a: string;
}

export default function Faq() {
  const { t } = useTranslation();
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
        <nav aria-label="Breadcrumb" className="mb-4">
          <a href="/" className="text-sm text-gray-400 hover:text-gray-200">{t('faq.breadcrumbHome')}</a>
          <span className="px-2 text-gray-500" aria-hidden="true">/</span>
          <span className="text-sm text-gray-300">{t('faq.breadcrumbFaq')}</span>
        </nav>
        <h2 className="text-2xl font-semibold mb-6">{t('faq.title')}</h2>
        <div className="space-y-6">
          {items.map((item, idx) => (
            <section key={idx} className="bg-gray-800 border border-gray-700 rounded-lg p-5">
              <h3 className="text-lg font-semibold mb-2">{item.q}</h3>
              <p className="text-gray-300">{item.a}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
