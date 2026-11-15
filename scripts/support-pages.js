import fs from 'node:fs';

const locales = ['en', 'pt', 'es', 'zh'];
const pages = ['faq', 'how-it-works', 'privacy', 'contact'];
const languageNames = { en: 'English', pt: 'Português', es: 'Español', zh: '中文' };
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const basePath = base => {
  const segments = base.split('/').filter(Boolean);
  return `/${segments.join('/')}${segments.length ? '/' : ''}`;
};
const styles = `
  * { box-sizing: border-box }
  body { margin: 0; background: #111827; color: #e5e7eb; font: 16px/1.65 system-ui, -apple-system, sans-serif }
  a { color: #93c5fd; text-underline-offset: 3px }
  a:hover { color: #dbeafe }
  a:focus-visible { outline: 3px solid #93c5fd; outline-offset: 4px }
  header { background: #1f2937; border-bottom: 1px solid #374151 }
  header > div, main, footer { max-width: 860px; margin: auto; padding: 20px 24px }
  header > div { display: flex; justify-content: space-between; gap: 16px; align-items: center; flex-wrap: wrap }
  .brand { color: #f9fafb; font-size: 1.2rem; font-weight: 700; text-decoration: none }
  main { padding-top: 38px; padding-bottom: 48px; min-height: 60vh }
  h1 { font-size: 2rem; line-height: 1.2; color: #f9fafb; margin: 0 0 28px }
  h2 { font-size: 1.2rem; line-height: 1.35; color: #f9fafb; margin: 0 0 8px }
  h3 { font-size: 1rem; margin: 24px 0 6px; color: #f9fafb }
  section { margin: 0 0 30px }
  p { margin: 0 0 16px; overflow-wrap: anywhere }
  .examples { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 12px }
  .examples span { font-size: .85rem; color: #cbd5e1 }
  pre { margin: 4px 0 0; padding: 12px; background: #1f2937; border: 1px solid #374151;
    border-radius: 6px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere }
  footer { border-top: 1px solid #374151; color: #9ca3af; font-size: .9rem }
  nav { display: flex; flex-wrap: wrap; gap: 10px 20px }
  footer nav + nav { margin-top: 18px }
  a[aria-current] { color: #f9fafb; font-weight: 600 }
  @media (max-width: 480px) {
    header > div, main, footer { padding-left: 20px; padding-right: 20px }
    h1 { font-size: 1.65rem }
    main { padding-top: 30px }
  }
`;

function renderExamples(examples) {
  const { heading, leftLabel, rightLabel, items } = examples;
  return `<section><h2>${escapeHtml(heading)}</h2>${items.map(item => `
    <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.explanation)}</p>
    <div class="examples">
      <div><span>${escapeHtml(leftLabel)}</span><pre><code>${escapeHtml(item.left)}</code></pre></div>
      <div><span>${escapeHtml(rightLabel)}</span><pre><code>${escapeHtml(item.right)}</code></pre></div>
    </div>`).join('')}</section>`;
}

function pageBody(page, content, faq) {
  if (page === 'faq') return faq.map(item =>
    `<section><h2>${escapeHtml(item.q)}</h2><p>${escapeHtml(item.a)}</p></section>`).join('');
  if (page === 'how-it-works') return content.how.map(([title, text]) =>
    `<section><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></section>`).join('')
    + renderExamples(content.examples);
  if (page === 'privacy') return content.privacyText.map(text => `<p>${escapeHtml(text)}</p>`).join('');
  return `<p>${escapeHtml(content.contactText).replace('admin@smartjsondiff.com',
    '<a href="mailto:admin@smartjsondiff.com">admin@smartjsondiff.com</a>')}</p>`;
}

export function supportPages(base = '/') {
  const prefix = basePath(base);
  // Read on each generation so editing copy is visible in the dev server.
  const content = JSON.parse(fs.readFileSync(new URL('../src/content/support.json', import.meta.url)));
  const faq = Object.fromEntries(locales.map(locale => [locale,
    JSON.parse(fs.readFileSync(new URL(`../src/locales/${locale}.json`, import.meta.url))).faq.items]));
  const result = {};
  for (const locale of locales) for (const page of pages) {
    const c = content[locale];
    const href = (language, target) => `${prefix}${language}/${target}/`;
    const navigation = pages.map(target => `<a ${target === page ? 'aria-current="page"' : ''}
      href="${href(locale, target)}">${escapeHtml(c[target])}</a>`).join('');
    const languages = locales.map(language => `<a href="${href(language, page)}" lang="${language}"
      ${language === locale ? 'aria-current="true"' : ''}>${languageNames[language]}</a>`).join('');
    const alternatives = locales.map(language => `<link rel="alternate" hreflang="${language}"
      href="https://smartjsondiff.com/${language}/${page}/">`).join('');
    const description = page === 'faq' ? faq[locale][0].a : page === 'how-it-works' ? c.how[0][1]
      : page === 'privacy' ? c.privacyText[0] : c.contactText;
    const title = escapeHtml(c[page]);
    result[`${locale}/${page}/index.html`] = `<!doctype html>
<html lang="${locale}"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="google-adsense-account" content="ca-pub-6364476119143776">
  <title>${title} — Smart JSON Diff</title><meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="https://smartjsondiff.com/${locale}/${page}/">
  ${prefix !== '/' ? '<meta name="robots" content="noindex, nofollow">' : ''}${alternatives}
  <meta name="theme-color" content="#111827"><style>${styles}</style>
</head><body>
  <header><div><a class="brand" href="${prefix}#/${locale}">Smart JSON Diff</a>
    <a href="${prefix}#/${locale}">← ${escapeHtml(c.home)}</a></div></header>
  <main><h1>${title}</h1>${pageBody(page, c, faq[locale])}</main>
  <footer><nav aria-label="${escapeHtml(c.nav)}">${navigation}</nav>
    <nav aria-label="${escapeHtml(c.languages)}">${languages}</nav></footer>
</body></html>`;
  }
  return result;
}

export function supportPagesPlugin() {
  let base = '/';
  return {
    name: 'support-pages',
    configResolved(config) { base = config.base; },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        let pathname;
        try { pathname = decodeURIComponent((req.url || '').split('?')[0]); }
        catch { res.statusCode = 400; res.end('Bad request'); return; }
        const prefix = basePath(base);
        const key = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname.replace(/^\//, '');
        const file = key.endsWith('/index.html') ? key : key.endsWith('/') ? `${key}index.html` : `${key}/index.html`;
        if (!/^(en|pt|es|zh)\/(faq|how-it-works|privacy|contact)\/index\.html$/.test(file)) return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(supportPages(base)[file]);
      });
    },
    transformIndexHtml(html) {
      return basePath(base) === '/' ? html : html.replace('<meta name="robots" content="index, follow" />',
        '<meta name="robots" content="noindex, nofollow" />');
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(supportPages(base))) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  };
}
