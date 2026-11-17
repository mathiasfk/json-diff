import site from './content/site.json';
import { isLocale, type Locale } from './i18n-config';

export const SITE_ORIGIN = site.origin;
export const homeContent = site.home;
export const homePath = (locale: Locale) => locale === 'en' ? '/' : `/${locale}/`;
export function localeFromPath(path: string): Locale {
  const segment = path.replace(/^\/+|\/+$/g, '');
  return isLocale(segment) ? segment : 'en';
}
export function normalizeLegacyUrl(input: URL, base: string): URL {
  const url = new URL(input.href);
  const prefix = `/${base.split('/').filter(Boolean).join('/')}${base.split('/').filter(Boolean).length ? '/' : ''}`;
  if (!url.pathname.startsWith(prefix)) return url;
  const relative = url.pathname.slice(prefix.length).replace(/\/+$/, '');
  if (relative === 'en') { url.pathname = prefix; return url; }
  if (relative !== '') return url;
  const match = url.hash.match(/^#\/(en|pt|es|zh)(?:\/(faq))?\/?$/);
  const queryLocale = url.searchParams.get('lang');
  if (match && isLocale(match[1])) {
    url.pathname = match[2] ? `${prefix}${match[1]}/faq/` : `${prefix}${homePath(match[1]).slice(1)}`;
    url.hash = '';
  } else if (isLocale(queryLocale)) {
    url.pathname = `${prefix}${homePath(queryLocale).slice(1)}`;
    url.searchParams.delete('lang');
  }
  return url;
}
export function updateHead(locale: Locale) {
  const content = homeContent[locale];
  const url = `${SITE_ORIGIN}${homePath(locale)}`;
  document.documentElement.lang = locale;
  document.title = content.title;
  for (const [selector, value] of [
    ['meta[name="title"]', content.title], ['meta[name="description"]', content.description],
    ['meta[name="inLanguage"]', locale], ['meta[property="og:title"]', content.title],
    ['meta[property="og:description"]', content.description], ['meta[property="og:url"]', url],
    ['meta[property="og:locale"]', site.ogLocales[locale]], ['meta[name="twitter:title"]', content.title],
    ['meta[name="twitter:description"]', content.description], ['meta[name="twitter:url"]', url],
    ['link[rel="canonical"]', url],
  ]) {
    const node = document.querySelector(selector);
    if (node) node.setAttribute(selector.startsWith('link') ? 'href' : 'content', value);
  }
  const structured = document.getElementById('application-schema');
  if (structured) structured.textContent = JSON.stringify(applicationSchema(locale));
}
export function applicationSchema(locale: Locale) {
  return { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Smart JSON Diff', description: homeContent[locale].description, url: `${SITE_ORIGIN}${homePath(locale)}`, applicationCategory: 'DeveloperApplication', operatingSystem: 'Any', inLanguage: locale, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } };
}
