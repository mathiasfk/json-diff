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
        'Instead of a naive diff, Smart JSON Diff performs a semantic comparison. It normalizes both inputs by sorting object properties alphabetically and reorders arrays to align equivalent items. When a unique key exists across both arrays, items are aligned by that key; otherwise, items are matched by normalized content to minimize noise and surface only the most relevant differences. The comparison runs entirely in your browser using jsondiffpatch under the hood.'
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
        'We find an ordering that maximizes similarity between the two versions. When a unique key is present in both arrays, items are aligned by that key; otherwise items are aligned by normalized content, so you see only the most relevant differences. Array items are treated as a multiset: reordering the same items produces no diff, so [1, 2, 3] and [3, 2, 1] are considered equivalent.'
    },
    {
      q: 'Which data formats does Smart JSON Diff support?',
      a:
        'Smart JSON Diff supports JSON (the default), JSONL (JSON Lines), YAML, CSV, and TSV. Use the format selector on each side to choose the format of your input. The tool parses each format and normalizes it to a common internal representation before performing the semantic comparison, so you can compare across formats — for example, a YAML file against a JSON file. Table formats (CSV/TSV) keep every cell as a string to avoid silent type coercion; YAML anchors/aliases are not expanded by the built-in parser (a known limitation).'
    },
    {
      q: 'Is it safe to paste sensitive data?',
      a:
        'Yes. All processing happens locally in your browser. We do not collect the data you compare. For feature requests or bugs, open an issue at github.com/mathiasfk/json-diff/issues.'
    },
    {
      q: 'How do I report bugs?',
      a:
        'Send an email to admin@smartjsondiff.com, or open an issue at github.com/mathiasfk/json-diff/issues.'
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
      <Header showNav={false} homeLink={true} />
      <main className="max-w-screen-2xl mx-auto p-6" role="main">
        <nav aria-label="Breadcrumb" className="mb-4">
          <a href="/" className="text-sm text-gray-400 hover:text-gray-200">Home</a>
          <span className="px-2 text-gray-500" aria-hidden="true">/</span>
          <span className="text-sm text-gray-300">FAQ</span>
        </nav>
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
