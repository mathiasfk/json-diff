import { describe, expect, it } from 'vitest';
import { normalizeLegacyUrl, localeFromPath } from './site';

describe('URL contract', () => {
  const normalize = (url: string, base = '/') => normalizeLegacyUrl(new URL(`https://example.com${url}`), base).toString();
  it.each([
    ['/#/en', 'https://example.com/'],
    ['/#/pt/', 'https://example.com/pt/'],
    ['/?utm=x#/es/faq', 'https://example.com/es/faq/?utm=x'],
    ['/?lang=zh&utm=x#section', 'https://example.com/zh/?utm=x#section'],
    ['/pt/?lang=zh#/es', 'https://example.com/pt/?lang=zh#/es'],
    ['/?lang=fr#section', 'https://example.com/?lang=fr#section'],
    ['/en/?utm=x#section', 'https://example.com/?utm=x#section'],
  ])('normalizes %s', (input, expected) => expect(normalize(input)).toBe(expected));
  it('respects a preview base', () => expect(normalize('/preview/pr-123/?lang=pt&utm=x', '/preview/pr-123/')).toBe('https://example.com/preview/pr-123/pt/?utm=x'));
  it('uses English for the root and invalid paths', () => {
    expect(localeFromPath('/')).toBe('en');
    expect(localeFromPath('/pt/')).toBe('pt');
    expect(localeFromPath('/nonsense/')).toBe('en');
  });
});
