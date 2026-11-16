import { describe, expect, it } from 'vitest';
import en from './en.json';
import pt from './pt.json';
import es from './es.json';
import zh from './zh.json';

describe('array comparison translations', () => {
  it.each(Object.entries({ en, pt, es, zh }))('%s includes every new string without fallback', (_language, translations) => {
    for (const key of ['legend', 'semantic', 'semanticDescription', 'position', 'positionDescription', 'resultMode'] as const) {
      expect(translations.arrayComparison[key].trim()).not.toBe('');
    }
    expect(translations.arrayComparison.resultMode).toContain('{{mode}}');
    expect(translations.diffViewer.equivalentBodyPosition.trim()).not.toBe('');
  });
});
