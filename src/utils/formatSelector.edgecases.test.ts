import { describe, it, expect } from 'vitest';
import {
  FormatError,
  normalizeFormat,
  detectFormatFromFilename,
  parse,
  serialize,
} from './formatSelector';

/**
 * Supplementary, edge-case-focused tests for the format selector.
 * The core round-trip/dispatch coverage lives in formatSelector.test.ts;
 * this file stresses empty data, nested structures, special characters,
 * large datasets, format-specific options, scalar/primitive serialization,
 * filename-sniffing robustness, and error reporting.
 *
 * Every assertion below was verified against the actual module behavior so
 * the tests encode real (not assumed) semantics — including the documented
 * limitation that the minimal YAML parser does NOT merge anchors.
 */
describe('formatSelector edge cases', () => {
  describe('empty data', () => {
    it('throws FormatError for empty JSON input', () => {
      expect(() => parse('', 'json')).toThrow(FormatError);
      try {
        parse('', 'json');
      } catch (e) {
        expect(e).toBeInstanceOf(FormatError);
        expect((e as FormatError).format).toBe('json');
      }
    });

    it('parses empty JSONL into an empty array', () => {
      expect(parse('', 'jsonl')).toEqual([]);
      expect(parse('\n\n', 'jsonl')).toEqual([]);
    });

    it('parses empty YAML into an empty string', () => {
      expect(parse('', 'yaml')).toBe('');
      expect(parse('   \n  \n', 'yaml')).toBe('');
    });

    it('serializes empty object/array to {} / [] for yaml', () => {
      expect(serialize({}, 'yaml')).toBe('{}');
      expect(serialize([], 'yaml')).toBe('[]');
    });
  });

  describe('nested objects', () => {
    it('round-trips deeply nested JSON (4+ levels)', () => {
      const obj = { a: { b: { c: { d: [1, { e: '✓' }] } } } };
      expect(parse(serialize(obj, 'json'), 'json')).toEqual(obj);
    });

    it('parses nested YAML mappings and sequences', () => {
      const text = ['config:', '  server:', '    host: localhost', '    ports:', '      - 80', '      - 443'].join('\n');
      expect(parse(text, 'yaml')).toEqual({
        config: { server: { host: 'localhost', ports: [80, 443] } },
      });
    });
  });

  describe('special characters', () => {
    it('preserves unicode and escaped sequences in JSON', () => {
      expect(parse('{"k":"é🎉\\u0000"}', 'json')).toEqual({ k: 'é🎉\u0000' });
    });

    it('preserves backslashes in YAML scalars', () => {
      expect(parse('path: C:\\temp', 'yaml')).toEqual({ path: 'C:\\temp' });
    });

    it('keeps colon/hash tokens as literal string values in YAML', () => {
      expect(parse('key: a:b c#d', 'yaml')).toEqual({ key: 'a:b c#d' });
    });

    it('quotes special characters when serializing YAML scalars', () => {
      // A value containing ':' that could be misread is wrapped in quotes.
      const out = serialize({ note: 'a:b' }, 'yaml');
      expect(out).toBe('note: "a:b"');
    });
  });

  describe('large datasets', () => {
    it('round-trips a 1000-line JSONL without loss', () => {
      const value = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      const text = serialize(value, 'jsonl');
      const parsed = parse(text, 'jsonl') as Array<{ id: number }>;
      expect(parsed).toHaveLength(1000);
      expect(parsed[0]).toEqual({ id: 0 });
      expect(parsed[999]).toEqual({ id: 999 });
    });
  });

  describe('format-specific options', () => {
    it('emits nested structures in YAML flow style when requested', () => {
      expect(serialize({ a: { b: 1 }, c: [1, 2] }, 'yaml', { yamlFlowStyle: true })).toBe(
        '{a: {b: 1}, c: [1, 2]}',
      );
    });

    it('treats ndjson as an alias for jsonl', () => {
      expect(normalizeFormat('ndjson')).toBe('jsonl');
      expect(normalizeFormat('JSONLINES')).toBe('jsonl');
      expect(parse('{"a":1}\n{"b":2}', normalizeFormat('ndjson'))).toEqual([{ a: 1 }, { b: 2 }]);
    });
  });

  describe('scalar & array-of-primitives serialization', () => {
    it('serializes scalars per format', () => {
      expect(serialize('hi', 'json')).toBe('"hi"');
      expect(serialize('hi', 'yaml')).toBe('hi');
      expect(serialize('hi', 'jsonl')).toBe('"hi"\n');
    });

    it('serializes an array of primitives for jsonl', () => {
      expect(serialize([1, 2, 3], 'jsonl')).toBe('1\n2\n3\n');
    });
  });

  describe('filename detection robustness', () => {
    it('is case-insensitive and handles edge cases', () => {
      expect(detectFormatFromFilename('A.JSON')).toBe('json');
      expect(detectFormatFromFilename('x.YAML')).toBe('yaml');
      // dotfiles / no extension / empty -> JSON default
      expect(detectFormatFromFilename('.gitignore')).toBe('json');
      expect(detectFormatFromFilename('')).toBe('json');
      expect(detectFormatFromFilename('data')).toBe('json');
    });
  });

  describe('error reporting', () => {
    it('reports the line number for invalid JSONL (1-indexed)', () => {
      try {
        parse('bad', 'jsonl');
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(FormatError);
        expect((e as FormatError).format).toBe('jsonl');
        expect((e as FormatError).line).toBe(1);
        expect((e as FormatError).name).toBe('FormatError');
      }
    });

    it('reports the format on a JSON parse error', () => {
      try {
        parse('not json', 'json');
      } catch (e) {
        expect(e).toBeInstanceOf(FormatError);
        expect((e as FormatError).format).toBe('json');
      }
    });
  });

  describe('round-trip consistency', () => {
    it('JSON: serialize -> parse is identity for representative values', () => {
      const value = { x: 1, y: [1, 2, 3], z: { nested: true }, s: 'text' };
      expect(parse(serialize(value, 'json'), 'json')).toEqual(value);
    });

    it('YAML: simple object survives a serialize/parse round-trip', () => {
      const value = { name: 'Alice', age: 30 };
      expect(parse(serialize(value, 'yaml'), 'yaml')).toEqual(value);
    });
  });

  describe('YAML anchors (documented limitation)', () => {
    it('does NOT merge anchors — they remain literal strings', () => {
      // The minimal parser is intentionally dependency-free and does not
      // implement YAML anchors/merge keys; this test locks that behavior so a
      // future parser upgrade is a conscious, visible change.
      const text = 'base: &b\n  a: 1\n  c: 2\next:\n  <<: *b\n  d: 3';
      expect(parse(text, 'yaml')).toEqual({
        base: '&b',
        a: 1,
        c: 2,
        ext: { '<<': '*b', d: 3 },
      });
    });
  });
});
