import fs from 'node:fs';

const site = JSON.parse(fs.readFileSync(new URL('../src/content/site.json', import.meta.url)));
const { locales, pages, names: languageNames, origin } = site;
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const basePath = base => {
  const segments = base.split('/').filter(Boolean);
  return `/${segments.join('/')}${segments.length ? '/' : ''}`;
};
const styles = `
  * { box-sizing: border-box }
  body { margin: 0; min-width: 320px; min-height: 100vh; background: var(--surface-base); color: var(--text-primary) }
  a { color: var(--text-secondary); text-underline-offset: 4px }
  a:hover { color: var(--text-primary) }
  a:focus-visible { outline: 2px solid #60a5fa; outline-offset: 4px }
  main { max-width: 920px; margin: auto; padding: 40px 24px 48px; min-height: 60vh }
  main h1 { font-size: 1.75rem; line-height: 1.25; font-weight: 600; letter-spacing: -.025em; margin: 0 0 24px }
  main h2 { font-size: 1.125rem; line-height: 1.4; font-weight: 600; margin: 0 0 8px }
  main h3 { font-size: 1rem; line-height: 1.4; font-weight: 600; margin: 24px 0 6px }
  section { margin: 0 0 16px; padding: 20px; background: var(--surface-raised); border: 1px solid var(--surface-border); border-radius: 6px }
  main > p { color: var(--text-secondary) }
  p { margin: 0 0 16px; overflow-wrap: anywhere }
  section > p:last-child { margin-bottom: 0; color: var(--text-secondary) }
  .examples { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 12px }
  .examples span { font-size: .875rem; color: var(--text-secondary) }
  .faq-example { margin-top: 20px }
  .faq-example p { margin-top: 10px; color: var(--text-secondary) }
  pre { margin: 4px 0 0; padding: 12px; background: var(--surface-base); border: 1px solid var(--surface-border);
    border-radius: 4px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere }
  footer { max-width: 1536px; margin: auto; padding: 0 24px 20px; color: var(--text-muted); font-size: .875rem }
  footer nav { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px 20px }
  footer a { color: var(--text-muted) }
  a[aria-current] { color: var(--text-primary); font-weight: 600 }
  @media (max-width: 480px) { main { padding: 28px 16px 40px } main h1 { font-size: 1.5rem } section { padding: 16px } }
`;

function renderExamplePair(item, leftLabel, rightLabel) {
  return `<div class="examples">
    <div><span>${escapeHtml(leftLabel)}</span><pre><code>${escapeHtml(item.left)}</code></pre></div>
    <div><span>${escapeHtml(rightLabel)}</span><pre><code>${escapeHtml(item.right)}</code></pre></div>
  </div>`;
}

function renderExamples(examples) {
  const { heading, leftLabel, rightLabel, items } = examples;
  return `<section><h2>${escapeHtml(heading)}</h2>${items.map(item => `
    <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.explanation)}</p>
    ${renderExamplePair(item, leftLabel, rightLabel)}`).join('')}</section>`;
}

function pageBody(page, content, faq) {
  if (page === 'faq') return faq.map(item =>
    `<section><h2>${escapeHtml(item.q)}</h2><p>${escapeHtml(item.a)}</p>
      ${(item.examples || []).map(example => `<div class="faq-example">
        ${renderExamplePair(example, content.examples.leftLabel, content.examples.rightLabel)}
        <p>${escapeHtml(example.explanation)}</p></div>`).join('')}</section>`).join('');
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
  const sharedStyles = fs.readFileSync(new URL('../src/shared.css', import.meta.url), 'utf8');
  const content = JSON.parse(fs.readFileSync(new URL('../src/content/support.json', import.meta.url)));
  const sharedLabels = JSON.parse(fs.readFileSync(new URL('../src/content/support-nav.json', import.meta.url)));
  const translations = Object.fromEntries(locales.map(locale => [locale,
    JSON.parse(fs.readFileSync(new URL(`../src/locales/${locale}.json`, import.meta.url)))]));
  const faq = Object.fromEntries(locales.map(locale => [locale, translations[locale].faq.items]));
  const result = {};
  for (const locale of locales) for (const page of pages) {
    const c = { ...content[locale], ...sharedLabels[locale], examples: { ...content[locale].examples, ...sharedLabels[locale].examples } };
    const href = (language, target) => `${prefix}${language}/${target}/`;
    const navigation = pages.map(target => `<a ${target === page ? 'aria-current="page"' : ''}
      href="${href(locale, target)}">${escapeHtml(c[target])}</a>`).join('');
    const languageOptions = locales.map(language => `<option value="${href(language, page)}"
      lang="${language}" ${language === locale ? 'selected' : ''}>${languageNames[language]}</option>`).join('');
    const alternatives = locales.map(language => `<link rel="alternate" hreflang="${language}"
      href="${origin}/${language}/${page}/">`).join('');
    const description = page === 'faq' ? faq[locale][0].a : page === 'how-it-works' ? c.how[0][1]
      : page === 'privacy' ? c.privacyText[0] : c.contactText;
    const image = origin + '/' + site.assets[locale].image;
    const title = escapeHtml(c[page]);
    result[`${locale}/${page}/index.html`] = `<!doctype html>
<html lang="${locale}"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="google-adsense-account" content="ca-pub-6364476119143776">
  <title>${title} — Smart JSON Diff</title><meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${origin}/${locale}/${page}/">
  ${prefix !== '/' ? '<meta name="robots" content="noindex, nofollow">' : ''}${alternatives}<link rel="alternate" hreflang="x-default" href="${origin}/en/${page}/">
  <meta property="og:type" content="website"><meta property="og:locale" content="${site.ogLocales[locale]}"><meta property="og:title" content="${title} — Smart JSON Diff"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${origin}/${locale}/${page}/"><meta property="og:image" content="${image}">
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title} — Smart JSON Diff"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:url" content="${origin}/${locale}/${page}/"><meta name="twitter:image" content="${image}">
  <meta name="theme-color" content="#181818"><style>${sharedStyles}${styles}</style>
  <script>
    (function () {
      var theme;
      try { theme = localStorage.getItem('jsonDiff.theme'); } catch (e) { /* Storage may be unavailable. */ }
      if (theme !== 'light' && theme !== 'dark') {
        theme = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      }
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    }());
  </script>
</head><body>
  <header class="site-header"><div class="site-header-inner">
    <a class="site-title" href="${prefix}${locale === 'en' ? '' : `${locale}/`}">Smart JSON Diff</a>
      <p class="site-subtitle">${escapeHtml(translations[locale].header.subtitle)}</p>
    <nav class="site-header-actions" aria-label="${escapeHtml(translations[locale].header.primaryNav)}">
      <a class="site-home" href="${prefix}${locale === 'en' ? '' : `${locale}/`}" aria-label="${escapeHtml(translations[locale].header.homeAria)}">← ${escapeHtml(translations[locale].header.home)}</a>
      <button type="button" id="theme-toggle" class="theme-toggle" hidden
        data-light="${escapeHtml(translations[locale].theme.light)}" data-dark="${escapeHtml(translations[locale].theme.dark)}"
        data-switch-light="${escapeHtml(translations[locale].theme.switchLight)}" data-switch-dark="${escapeHtml(translations[locale].theme.switchDark)}"><span aria-hidden="true"></span><span></span></button>
      <label class="site-language" for="language-selector"><span>${escapeHtml(translations[locale].app.language)}</span>
        <select id="language-selector">${languageOptions}</select></label>
    </nav></div></header>
  <main><h1>${title}</h1>${pageBody(page, c, faq[locale])}</main>
  <footer><nav aria-label="${escapeHtml(c.nav)}">${navigation}</nav></footer>
  <script>
    var themeButton = document.getElementById('theme-toggle');
    function updateThemeButton() {
      var dark = document.documentElement.dataset.theme === 'dark';
      var label = dark ? themeButton.dataset.switchLight : themeButton.dataset.switchDark;
      themeButton.setAttribute('aria-label', label);
      themeButton.setAttribute('title', label);
      themeButton.children[0].textContent = dark ? '☀' : '☾';
      themeButton.children[1].textContent = dark ? themeButton.dataset.light : themeButton.dataset.dark;
    }
    updateThemeButton();
    themeButton.hidden = false;
    themeButton.addEventListener('click', function () {
      var theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      try { localStorage.setItem('jsonDiff.theme', theme); } catch (e) { /* Storage may be unavailable. */ }
      updateThemeButton();
    });
    document.getElementById('language-selector').addEventListener('change', function () {
      window.location.assign(this.value);
    });
  </script>
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
    generateBundle() {
      for (const [fileName, source] of Object.entries(supportPages(base))) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  };
}
