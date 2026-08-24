import { describe, it, expect, afterEach } from 'vitest';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  isLocale,
  detectInitialLocale,
} from './i18n-config';

// navigator.language is a read-only getter; override it for the duration of a
// test and restore it afterwards.
function setNavigatorLanguage(lang: string) {
  Object.defineProperty(navigator, 'language', {
    configurable: true,
    get: () => lang,
  });
}

afterEach(() => {
  // Restore to the real value (or a neutral one) after each test.
  Object.defineProperty(navigator, 'language', {
    configurable: true,
    get: () => 'en-US',
  });
});

describe('i18n-config', () => {
  it('declares the four required supported locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'pt', 'zh', 'es']);
  });

  it('uses English as the default/fallback locale', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('has a native display name for every supported locale', () => {
    for (const lng of SUPPORTED_LOCALES) {
      expect(LOCALE_NAMES[lng]).toBeTruthy();
      expect(typeof LOCALE_NAMES[lng]).toBe('string');
    }
  });

  it('validates locale strings with isLocale', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('pt')).toBe(true);
    expect(isLocale('zh')).toBe(true);
    expect(isLocale('es')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it('detects the initial locale from navigator language primary subtag', () => {
    setNavigatorLanguage('pt-BR');
    expect(detectInitialLocale()).toBe('pt');

    setNavigatorLanguage('zh-CN');
    expect(detectInitialLocale()).toBe('zh');

    setNavigatorLanguage('es-MX');
    expect(detectInitialLocale()).toBe('es');
  });

  it('falls back to the default locale for unsupported navigator languages', () => {
    setNavigatorLanguage('fr-FR');
    expect(detectInitialLocale()).toBe(DEFAULT_LOCALE);

    setNavigatorLanguage('de');
    expect(detectInitialLocale()).toBe(DEFAULT_LOCALE);
  });
});
