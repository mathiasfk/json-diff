import { describe, it, expect } from 'vitest';
import i18n from './i18n';

// Verifies the locale resources carry every key the UI references and that the
// FAQ `returnObjects` array resolves with the expected shape in the default
// (en) locale. This guards against future key drift between code and locales.
describe('i18n UI translation coverage', () => {
  const keys = [
    'app.title',
    'app.clearLeft',
    'app.formatLeft',
    'app.compare',
    'app.formatRight',
    'app.clearRight',
    'header.subtitle',
    'header.faq',
    'header.back',
    'header.home',
    'header.primaryNav',
    'header.backNav',
    'header.homeNav',
    'json2toon.cta',
    'jsonEditor.placeholder',
    'jsonEditor.loading',
    'jsonEditor.formatLabel',
    'jsonEditor.leftInput',
    'jsonEditor.rightInput',
    'jsonEditor.clearLeft',
    'jsonEditor.formatLeft',
    'jsonEditor.compare',
    'jsonEditor.formatRight',
    'jsonEditor.clearRight',
    'jsonEditor.inputEditors',
    'jsonEditor.comparisonActions',
    'jsonEditor.comparisonResults',
    'jsonEditor.loadingDiff',
    'formatSelector.ariaWithLabel',
    'formatSelector.ariaDefault',
    'diffViewer.title',
    'diffViewer.back',
    'diffViewer.resultsRegion',
    'diffViewer.differencesView',
    'diffViewer.equivalentTitle',
    'diffViewer.equivalentBody',
    'faq.breadcrumbHome',
    'faq.breadcrumbFaq',
    'faq.title',
  ];

  it('resolves every referenced key in the default (en) locale', () => {
    for (const k of keys) {
      const value = i18n.t(k);
      expect(value, `key "${k}" should resolve to a non-key string`).not.toBe(k);
      expect(value).toBeTruthy();
    }
  });

  it('returns the FAQ items as a non-empty array of {q, a}', () => {
    const items = i18n.t('faq.items', { returnObjects: true }) as Array<{ q: string; a: string }>;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item).toHaveProperty('q');
      expect(item).toHaveProperty('a');
      expect(typeof item.q).toBe('string');
      expect(typeof item.a).toBe('string');
    }
  });

  it('interpolates the label into the format selector aria-label', () => {
    expect(i18n.t('formatSelector.ariaWithLabel', { label: 'Format' })).toContain('Format');
  });
});
