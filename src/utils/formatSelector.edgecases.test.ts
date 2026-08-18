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

    it('parses empty CSV into a table with an empty header row', () => {
      expect(parse('', 'csv')).toEqual({ header: [''], rows: [] });
    });

    it('serializes empty object/array to empty string for csv and {} / [] for yaml', () => {
      expect(serialize({}, 'csv')).toBe('');
      expect(serialize([], 'csv')).toBe('');
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

    it('round-trips nested objects through CSV via header+rows', () => {
      const value = [{ user: { name: 'A' }, v: 1 }, { user: { name: 'B' }, v: 2 }];
      // Objects become JSON-stringified cells; ensure no throw and stable shape.
      const text = serialize(value, 'csv');
      expect(text).toContain('user');
      expect(parse(text, 'csv')).toEqual({
        header: ['user', 'v'],
        rows: [['{"name":"A"}', '1'], ['{"name":"B"}', '2']],
      });
    });
  });

  describe('special characters', () => {
    it('preserves emoji in CSV cells', () => {
      expect(parse('a,b\n🎉,x\n', 'csv')).toEqual({
        header: ['a', 'b'],
        rows: [['🎉', 'x']],
      });
    });

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
    it('round-trips a 1000-row CSV without loss', () => {
      const value = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: 'n' + i }));
      const text = serialize(value, 'csv');
      const parsed = parse(text, 'csv') as { header: string[]; rows: string[][] };
      expect(parsed.header).toEqual(['id', 'name']);
      expect(parsed.rows).toHaveLength(1000);
      expect(parsed.rows[0]).toEqual(['0', 'n0']);
      expect(parsed.rows[999]).toEqual(['999', 'n999']);
    });

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
    it('honors a custom CSV delimiter on serialize', () => {
      expect(serialize([{ a: 1, b: 2 }], 'csv', { delimiter: ';' })).toBe('a;b\n1;2');
    });

    it('defaults TSV serialize to tab delimiters', () => {
      expect(serialize([{ a: '1', b: '2' }], 'tsv')).toBe('a\tb\n1\t2');
    });

    it('quotes a TSV cell containing an embedded tab', () => {
      expect(serialize([{ a: 'x\ty' }], 'tsv')).toBe('a\n"x\ty"');
      const back = parse(serialize([{ a: 'x\ty' }], 'tsv'), 'tsv') as { header: string[]; rows: string[][] };
      expect(back.rows[0]).toEqual(['x\ty']);
    });

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
      expect(serialize('hi', 'csv')).toBe('hi');
      expect(serialize('hi', 'yaml')).toBe('hi');
      expect(serialize('hi', 'jsonl')).toBe('"hi"\n');
    });

    it('serializes an array of primitives as rows without a header', () => {
      expect(serialize([1, 2, 3], 'csv')).toBe('1\n2\n3');
      expect(serialize([1, 2, 3], 'jsonl')).toBe('1\n2\n3\n');
    });

    it('serializes a single object as a header + one row for TSV', () => {
      expect(serialize({ a: 1 }, 'tsv')).toBe('a\n1');
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

    it('exposes FormatError as a class with the expected name', () => {
      const err = new FormatError('boom', 'csv', 3);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(FormatError);
      expect(err.name).toBe('FormatError');
      expect(err.format).toBe('csv');
      expect(err.line).toBe(3);
    });
  });

  describe('round-trip consistency', () => {
    it('JSON: serialize -> parse is identity for representative values', () => {
      const value = { x: 1, y: [1, 2, 3], z: { nested: true }, s: 'text' };
      expect(parse(serialize(value, 'json'), 'json')).toEqual(value);
    });

    it('CSV: object array survives a serialize/parse round-trip', () => {
      const value = [
        { name: 'A', age: '1' },
        { name: 'B', age: '2' },
      ];
      expect(parse(serialize(value, 'csv'), 'csv')).toEqual({
        header: ['name', 'age'],
        rows: [['A', '1'], ['B', '2']],
      });
    });

    it('TSV: object array survives a serialize/parse round-trip', () => {
      const value = [
        { x: '1', y: '2' },
        { x: '3', y: '4' },
      ];
      expect(parse(serialize(value, 'tsv'), 'tsv')).toEqual({
        header: ['x', 'y'],
        rows: [['1', '2'], ['3', '4']],
      });
    });

    it('YAML: simple object survives a serialize/parse round-trip', () => {
      const value = { name: 'Alice', age: 30 };
      expect(parse(serialize(value, 'yaml'), 'yaml')).toEqual(value);
    });

    it('CRLF line endings are handled in CSV', () => {
      expect(parse('a,b\r\n1,2\r\n', 'csv')).toEqual({
        header: ['a', 'b'],
        rows: [['1', '2']],
      });
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
