import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const language = vi.hoisted(() => ({ resolvedLanguage: 'pt', language: 'pt' }));
vi.mock('../bootstrap-url', () => ({ redirectToSupport: false }));
vi.mock('i18next', () => ({ default: language }));

let browser: {
  location: { hostname: string };
  dataLayer: unknown[];
  gtag?: (...args: unknown[]) => void;
};

beforeEach(() => {
  vi.resetModules();
  language.resolvedLanguage = 'pt';
  language.language = 'pt';
  browser = { location: { hostname: 'smartjsondiff.com' }, dataLayer: [] };
  vi.stubGlobal('window', browser);
});

afterEach(() => {
  document.querySelectorAll('script[src*="googletagmanager.com"]').forEach(script => script.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const sent = () => browser.dataLayer.map(args => Array.from(args as ArrayLike<unknown>));

describe('analytics language context', () => {
  it('adds the active language to events with and without parameters, without mutating them', async () => {
    const { gtag } = await import('./analytics');
    const params = { side: 'left', array_comparison: 'semantic' };
    gtag('event', 'compare_click', params);
    gtag('event', 'load_example');
    expect(sent()).toEqual([
      ['event', 'compare_click', { language: 'pt', ...params }],
      ['event', 'load_example', { language: 'pt' }],
    ]);
    expect(params).not.toHaveProperty('language');
  });

  it('uses the new active language for subsequent events', async () => {
    const { gtag } = await import('./analytics');
    gtag('event', 'format_click');
    language.resolvedLanguage = 'zh';
    gtag('event', 'compare_completed');
    expect(sent()).toEqual([
      ['event', 'format_click', { language: 'pt' }],
      ['event', 'compare_completed', { language: 'zh' }],
    ]);
  });

  it('preserves the explicit destination language of a language-change event', async () => {
    const { gtag } = await import('./analytics');
    gtag('event', 'language_change', { language: 'es' });
    expect(sent()).toEqual([['event', 'language_change', { language: 'es' }]]);
  });

  it.each([
    ['', 'es', 'es'],
    ['unsupported', 'unsupported', 'en'],
  ])('falls back from resolved language %s and language %s to %s', async (resolved, current, expected) => {
    language.resolvedLanguage = resolved;
    language.language = current;
    const { gtag } = await import('./analytics');
    gtag('event', 'clear_click');
    expect(sent()).toEqual([['event', 'clear_click', { language: expected }]]);
  });

  it('leaves initialization and configuration commands unchanged', async () => {
    const { gtag } = await import('./analytics');
    const date = new Date();
    const config = { send_page_view: false };
    gtag('js', date);
    gtag('config', 'G-TEST', config);
    expect(sent()).toEqual([['js', date], ['config', 'G-TEST', config]]);
    expect(config).not.toHaveProperty('language');
  });

  it('queues one complete enriched command when gtag is unavailable', async () => {
    const { gtag } = await import('./analytics');
    browser.gtag = undefined;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    gtag('event', 'file_load_success', { format: 'yaml' });
    expect(sent()).toEqual([['event', 'file_load_success', { language: 'pt', format: 'yaml' }]]);
  });

  it('includes the same context in localhost debug output without sending an event', async () => {
    browser.location.hostname = 'localhost';
    const debug = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { gtag } = await import('./analytics');
    gtag('event', 'paste_auto_detect', { side: 'right' });
    expect(debug).toHaveBeenCalledWith('📊 Analytics (debug):', 'event', 'paste_auto_detect', { language: 'pt', side: 'right' });
    expect(browser.dataLayer).toEqual([]);
  });
});
