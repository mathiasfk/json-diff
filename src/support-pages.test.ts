import { describe, expect, it } from 'vitest';
import { supportPages } from '../scripts/support-pages.js';
import en from './locales/en.json';
import { JSDOM } from 'jsdom';

describe('static support pages', () => {
  it('emits readable localized pages with shared FAQ content', () => {
    const pages = supportPages('/');
    expect(Object.keys(pages)).toHaveLength(16);
    for (const locale of ['en', 'pt', 'es', 'zh']) {
      for (const page of ['faq', 'how-it-works', 'privacy', 'contact']) {
        const html = pages[`${locale}/${page}/index.html`];
        expect(html).toContain(`<html lang="${locale}">`);
        expect(html).toContain(`<link rel="canonical" href="https://smartjsondiff.com/${locale}/${page}/">`);
        expect(html).toContain(`href="/${locale === 'en' ? '' : `${locale}/`}"`);
        expect(html).toContain('<select id="language-selector">');
        expect(html).toContain(`value="/${locale}/${page}/"\n      lang="${locale}" selected`);
        expect(html).toContain('hreflang="x-default"');
      }
    }
    expect(pages['en/faq/index.html']).toContain(en.faq.items[0].q);
    expect(pages['en/how-it-works/index.html']).toContain('<pre><code>');
  });
  it('keeps links under the preview base and prevents preview indexing', () => {
    const html = supportPages('/preview/')['pt/privacy/index.html'];
    expect(html).toContain('href="/preview/pt/faq/"');
    expect(html).toContain('href="/preview/pt/"');
    expect(html).toContain('noindex, nofollow');
  });
  it('shares the saved theme and localized header across support pages', () => {
    const html = supportPages('/')['pt/faq/index.html'];
    const dom = new JSDOM(html, {
      url: 'https://smartjsondiff.com/pt/faq/',
      runScripts: 'dangerously',
      beforeParse(window: Window) { window.localStorage.setItem('jsonDiff.theme', 'light'); },
    });
    const { document, localStorage } = dom.window;
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.querySelector('.site-subtitle')?.textContent).toContain('Compare JSON');
    const button = document.querySelector('#theme-toggle') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Mudar para tema escuro');
    expect(button.hidden).toBe(false);
    button.click();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('jsonDiff.theme')).toBe('dark');
    expect(button.getAttribute('aria-label')).toBe('Mudar para tema claro');
    dom.window.close();
  });

  it('uses the system preference when there is no saved theme', () => {
    const dom = new JSDOM(supportPages('/')['en/privacy/index.html'], {
      url: 'https://smartjsondiff.com/en/privacy/',
      runScripts: 'dangerously',
      beforeParse(window: Window) {
        Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true }) });
      },
    });
    expect(dom.window.document.documentElement.dataset.theme).toBe('light');
    dom.window.close();
  });

});
