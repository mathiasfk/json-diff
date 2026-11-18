import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { JSDOM } from 'jsdom';
import { supportPages } from './support-pages.js';

const site = JSON.parse(fs.readFileSync('src/content/site.json'));
const labels = JSON.parse(fs.readFileSync('src/content/support-nav.json'));
const dist = 'dist';
const base = `/${(process.env.PREVIEW_BASE || '/').split('/').filter(Boolean).join('/')}${(process.env.PREVIEW_BASE || '/').split('/').filter(Boolean).length ? '/' : ''}`;
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const homePath = locale => locale === 'en' ? '/' : `/${locale}/`;
const write = (file, value) => { const dest = path.join(dist, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, value); };
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
function replaceMarked(html, name, value) {
  const start = `<!-- ${name}:START -->`, end = `<!-- ${name}:END -->`;
  if (html.split(start).length !== 2 || html.split(end).length !== 2 || html.indexOf(start) > html.indexOf(end)) throw new Error(`Missing or duplicate ${name} markers`);
  return html.slice(0, html.indexOf(start)) + start + value + html.slice(html.indexOf(end));
}
const schema = locale => ({ '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Smart JSON Diff', description: site.home[locale].description, url: site.origin + homePath(locale), applicationCategory: 'DeveloperApplication', operatingSystem: 'Any', inLanguage: locale, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } });
for (const locale of site.locales) {
  const c = site.home[locale], url = site.origin + homePath(locale);
  const { subtitle } = JSON.parse(fs.readFileSync(`src/locales/${locale}.json`)).header;
  if (!c?.title || !c.description || !subtitle) throw new Error(`Missing home copy: ${locale}`);
  const alternates = site.locales.map(l => `<link rel="alternate" hreflang="${l}" href="${site.origin}${homePath(l)}">`).join('');
  const meta = `\n<title>${esc(c.title)}</title><meta name="title" content="${esc(c.title)}"><meta name="description" content="${esc(c.description)}"><meta name="robots" content="${base === '/' ? 'index, follow' : 'noindex, nofollow'}"><meta name="inLanguage" content="${locale}"><link rel="canonical" href="${url}">${alternates}<link rel="alternate" hreflang="x-default" href="${site.origin}/">
<meta property="og:type" content="website"><meta property="og:site_name" content="Smart JSON Diff"><meta property="og:title" content="${esc(c.title)}"><meta property="og:description" content="${esc(c.description)}"><meta property="og:url" content="${url}"><meta property="og:locale" content="${site.ogLocales[locale]}"><meta property="og:image" content="${site.origin}/og-image-1200x630.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(c.title)}"><meta name="twitter:description" content="${esc(c.description)}"><meta name="twitter:url" content="${url}"><meta name="twitter:image" content="${site.origin}/og-image-1200x630.png">
<script id="application-schema" type="application/ld+json">${JSON.stringify(schema(locale))}</script><script type="application/ld+json">${JSON.stringify({ '@context':'https://schema.org', '@type':'Organization', name:'Smart JSON Diff', url:site.origin+'/', logo:site.origin+'/android-chrome-512x512.png' })}</script><script type="application/ld+json">${JSON.stringify({ '@context':'https://schema.org', '@type':'WebSite', name:'Smart JSON Diff', url:site.origin+'/' })}</script>\n`;
  const nav = labels[locale];
  const shell = `<header class="site-header"><div class="site-header-inner"><div><h1 class="site-title">Smart JSON Diff</h1><p class="site-subtitle">${esc(subtitle)}</p></div></div></header><main style="min-height:55vh;padding:24px"></main><footer style="padding:24px"><nav aria-label="${esc(nav.nav)}">${site.pages.map(p => `<a href="${base}${locale}/${p}/">${esc(nav[p])}</a> `).join('')}</nav></footer>`;
  let html = replaceMarked(template, 'SEO', meta).replace('<html lang="en">', `<html lang="${locale}">`);
  html = replaceMarked(html, 'SHELL', shell);
  write(locale === 'en' ? 'index.html' : `${locale}/index.html`, html);
}
const alias = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="canonical" href="${site.origin}/"><title>Smart JSON Diff</title></head><body><a href="${base}">Smart JSON Diff</a><script>location.replace(${JSON.stringify(base)} + location.search + location.hash)</script></body></html>`;
write('en/index.html', alias);
write('404.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Page not found</title></head><body><h1>Page not found</h1><p><a href="${base}">Smart JSON Diff</a></p>${site.locales.map(l => `<a href="${base}${homePath(l).slice(1)}" lang="${l}">${site.names[l]}</a> `).join('')}</body></html>`);
if (base === '/') {
 const urls = site.locales.flatMap(l => [homePath(l), ...site.pages.map(p => `/${l}/${p}/`)]);
 write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${site.origin}${u}</loc></url>`).join('')}</urlset>`);
} else { fs.rmSync(path.join(dist, 'sitemap.xml'), { force:true }); write('robots.txt', 'User-agent: *\nDisallow: /\n'); }
// Validate all generated documents and shared resource references.
const documents = { ...Object.fromEntries(Object.keys(supportPages(base)).map(file => [file, fs.readFileSync(path.join(dist, file), 'utf8')])), ...Object.fromEntries(site.locales.map(l => [l === 'en' ? 'index.html' : `${l}/index.html`, fs.readFileSync(path.join(dist, l === 'en' ? 'index.html' : `${l}/index.html`), 'utf8')])) };
let resources;
for (const [file, source] of Object.entries(documents)) {
 const dom = new JSDOM(source), doc = dom.window.document;
 if (!doc.querySelector('h1') || !doc.querySelector('meta[name="description"]') || doc.querySelectorAll('link[rel="canonical"]').length !== 1 || doc.querySelectorAll('link[rel="alternate"][hreflang]').length !== 5) throw new Error(`Invalid SEO document: ${file}`);
 if (base !== '/' && !doc.querySelector('meta[name="robots"][content*="noindex"]')) throw new Error(`Preview is indexable: ${file}`);
 const parts = file.split('/');
 const locale = file === 'index.html' ? 'en' : parts[0];
 const page = parts.length === 3 ? parts[1] : null;
 const expectedPath = page ? `/${locale}/${page}/` : homePath(locale);
 if (doc.documentElement.lang !== locale || doc.querySelector('link[rel="canonical"]').getAttribute('href') !== site.origin + expectedPath) throw new Error(`Invalid locale or canonical: ${file}`);
 for (const language of [...site.locales, 'x-default']) {
  const target = language === 'x-default' ? 'en' : language;
  const expected = site.origin + (page ? `/${target}/${page}/` : homePath(target));
  if (doc.querySelector(`link[rel="alternate"][hreflang="${language}"]`)?.getAttribute('href') !== expected) throw new Error(`Invalid alternate ${language}: ${file}`);
 }
 for (const node of doc.querySelectorAll('a[href], script[src], link[href]')) {
  const reference = node.getAttribute('href') || node.getAttribute('src');
  if (!reference?.startsWith('/')) continue;
  if (!reference.startsWith(base)) throw new Error(`Path escapes base: ${file} ${reference}`);
  const relative = reference.slice(base.length).split(/[?#]/)[0];
  const target = path.join(dist, relative || 'index.html');
  if (!fs.existsSync(target) || (fs.statSync(target).isDirectory() && !fs.existsSync(path.join(target, 'index.html')))) throw new Error(`Missing local reference: ${file} ${reference}`);
 }

 for (const tag of doc.querySelectorAll('script[type="application/ld+json"]')) JSON.parse(tag.textContent);
 if (!file.includes('/')) {
  resources = [...doc.querySelectorAll('script[src],link[rel="stylesheet"],link[rel="modulepreload"]')].map(e => e.getAttribute('src') || e.getAttribute('href'));
 } else if (/^(pt|es|zh)\/index.html$/.test(file)) {
  const actual = [...doc.querySelectorAll('script[src],link[rel="stylesheet"],link[rel="modulepreload"]')].map(e => e.getAttribute('src') || e.getAttribute('href'));
  if (JSON.stringify(actual) !== JSON.stringify(resources)) throw new Error(`Assets differ: ${file}`);
 }
}
for (const url of resources) {
 if (!url.startsWith(base) || !fs.existsSync(path.join(dist, url.slice(base.length)))) throw new Error(`Missing asset: ${url}`);
}
console.log(`Validated ${Object.keys(documents).length} canonical pages; HTML-declared resources gzip: ${resources.reduce((n, url) => n + gzipSync(fs.readFileSync(path.join(dist, url.slice(base.length)))).length, 0)} bytes`);
