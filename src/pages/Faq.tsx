import { useEffect, useMemo } from 'react';
import { Header } from '../components/Header';

interface FaqItem {
  q: string;
  a: string;
}

export default function Faq() {
  const items: FaqItem[] = useMemo(() => [
    {
      q: 'How does the comparison work?',
      a:
        'Instead of a naive diff, Smart JSON Diff performs a semantic comparison. It normalizes both inputs by sorting object properties alphabetically and reorders arrays to align equivalent items. When a unique key exists across both arrays, items are aligned by that key; otherwise, items are matched by normalized content to minimize noise and surface only the most relevant differences.'
    },
    {
      q: 'How is this different from other thousands of JSON diff tools?',
      a:
        'Smart JSON Diff treats array items as multisets, meaning it considers the order of items in the array to be irrelevant. This is in contrast to other JSON diff tools that treat arrays as sequences, meaning the order of items in the array is significant. For example, the arrays [1, 2, 3] and [3, 2, 1] are considered equivalent by Smart JSON Diff, while they are considered different by other JSON diff tools.'
    },
    {
      q: 'What do the colors mean in the diff?',
      a:
        'Green indicates additions and red indicates removals. The entire changed line is highlighted, and the exact changed segment is emphasized with a more saturated accent.'
    },
    {
      q: 'Does property order affect the result?',
      a:
        'No. Properties are sorted alphabetically before comparison, so objects with the same meaning but different key order are considered equivalent. For example, the objects { a: 1, b: 2 } and { b: 2, a: 1 } are considered equivalent.'
    },
    {
      q: 'Does array order affect the result?',
      a:
        'No. The best sorting key is found automatically, so arrays with the same items but different order are considered equivalent. For example, the arrays [{ id: 1, name: "John" }, { id: 2, name: "Jane" }] and [{ id: 2, name: "Jane" }, { id: 1, name: "John" }] are considered equivalent.'
    },
    {
      q: 'How are array differences handled?',
      a:
        'We find an ordering that maximizes similarity between the two versions. When a unique key is present in both arrays, items are aligned by that key; otherwise items are aligned by normalized content, so you see only the most relevant differences.'
    },
    {
      q: 'Is it safe to paste sensitive data?',
      a:
        'Yes. All processing happens locally in your browser. We do not collect the JSON you compare.'
    },
    {
      q: 'How do I report bugs?',
      a:
        'Send an email to admin@smartjsondiff.com.'
    }
  ], []);

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
      <Header />
      <main className="max-w-screen-2xl mx-auto p-6" role="main">
        <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
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


