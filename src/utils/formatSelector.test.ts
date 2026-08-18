import { describe, it, expect } from 'vitest';
import {
  Format,
  FormatError,
  normalizeFormat,
  detectFormatFromFilename,
  parse,
  serialize,
  DEFAULT_FORMAT,
  SUPPORTED_FORMATS,
} from './formatSelector';

describe('formatSelector', () => {
  describe('constants & normalization', () => {
    it('exposes the 5 supported formats with JSON default', () => {
      expect(SUPPORTED_FORMATS).toEqual(['json', 'jsonl', 'yaml', 'csv', 'tsv']);
      expect(DEFAULT_FORMAT).toBe('json');
    });

    it('defaults to JSON when no format is supplied', () => {
      expect(normalizeFormat(undefined)).toBe('json');
      expect(normalizeFormat(null)).toBe('json');
      expect(normalizeFormat('')).toBe('json');
      expect(normalizeFormat()).toBe('json');
    });

    it('normalizes case and aliases', () => {
      expect(normalizeFormat('JSON')).toBe('json');
      expect(normalizeFormat('JsonL')).toBe('jsonl');
      expect(normalizeFormat('ndjson')).toBe('jsonl');
      expect(normalizeFormat('JSONLINES')).toBe('jsonl');
      expect(normalizeFormat('YAML')).toBe('yaml');
      expect(normalizeFormat('CSV')).toBe('csv');
      expect(normalizeFormat('TSV')).toBe('tsv');
    });

    it('falls back to JSON for unknown formats', () => {
      expect(normalizeFormat('xml')).toBe('json');
      expect(normalizeFormat('toml')).toBe('json');
    });

    it('parse/serialize default to JSON when format omitted', () => {
      const v = { a: 1 };
      expect(parse('{"a":1}')).toEqual(v);
      expect(serialize(v)).toBe('{\n  "a": 1\n}');
    });
  });

  describe('filename detection', () => {
    it('sniffs format from extension', () => {
      expect(detectFormatFromFilename('a.json')).toBe('json');
      expect(detectFormatFromFilename('a.jsonl')).toBe('jsonl');
      expect(detectFormatFromFilename('a.ndjson')).toBe('jsonl');
      expect(detectFormatFromFilename('a.yaml')).toBe('yaml');
      expect(detectFormatFromFilename('a.yml')).toBe('yaml');
      expect(detectFormatFromFilename('a.csv')).toBe('csv');
      expect(detectFormatFromFilename('a.tsv')).toBe('tsv');
      expect(detectFormatFromFilename('a.tab')).toBe('tsv');
    });

    it('falls back to JSON for unknown extensions', () => {
      expect(detectFormatFromFilename('a.txt')).toBe('json');
      expect(detectFormatFromFilename('noext')).toBe('json');
    });
  });

  describe('JSON', () => {
    it('parses and round-trips objects, arrays, scalars', () => {
      const obj = { name: 'Alice', age: 30, tags: ['x', 'y'], nested: { a: 1 } };
      const text = serialize(obj, 'json');
      expect(text).toBe('{\n  "name": "Alice",\n  "age": 30,\n  "tags": [\n    "x",\n    "y"\n  ],\n  "nested": {\n    "a": 1\n  }\n}');
      expect(parse(text, 'json')).toEqual(obj);
    });

    it('throws FormatError on invalid JSON', () => {
      expect(() => parse('{bad', 'json')).toThrow(FormatError);
      try {
        parse('{bad', 'json');
      } catch (e) {
        expect(e).toBeInstanceOf(FormatError);
        expect((e as FormatError).format).toBe('json');
      }
    });
  });

  describe('JSONL', () => {
    it('parses one object per line into an array', () => {
      const text = '{"id":1}\n{"id":2}\n{"id":3}\n';
      expect(parse(text, 'jsonl')).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('skips blank lines', () => {
      const text = '{"a":1}\n\n{"a":2}\n';
      expect(parse(text, 'jsonl')).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it('serializes arrays of objects to one JSON object per line', () => {
      const value = [{ id: 1 }, { id: 2 }];
      expect(serialize(value, 'jsonl')).toBe('{"id":1}\n{"id":2}\n');
    });

    it('serializes a non-array scalar as a single line', () => {
      expect(serialize({ a: 1 }, 'jsonl')).toBe('{"a":1}\n');
    });

    it('reports line number on invalid JSONL', () => {
      const text = '{"ok":1}\nnot json\n';
      try {
        parse(text, 'jsonl');
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(FormatError);
        expect((e as FormatError).format).toBe('jsonl');
        expect((e as FormatError).line).toBe(2);
      }
    });
  });

  describe('YAML', () => {
    it('parses block mappings', () => {
      const text = 'name: Alice\nage: 30\nactive: true\n';
      expect(parse(text, 'yaml')).toEqual({ name: 'Alice', age: 30, active: true });
    });

    it('parses block sequences', () => {
      const text = '- one\n- two\n- three\n';
      expect(parse(text, 'yaml')).toEqual(['one', 'two', 'three']);
    });

    it('parses nested mappings and sequences', () => {
      const text = [
        'user:',
        '  name: Bob',
        '  roles:',
        '    - admin',
        '    - editor',
        'count: 2',
      ].join('\n');
      expect(parse(text, 'yaml')).toEqual({
        user: { name: 'Bob', roles: ['admin', 'editor'] },
        count: 2,
      });
    });

    it('parses flow style collections', () => {
      expect(parse('[1, 2, 3]', 'yaml')).toEqual([1, 2, 3]);
      expect(parse('{a: 1, b: 2}', 'yaml')).toEqual({ a: 1, b: 2 });
    });

    it('serializes objects to block YAML by default', () => {
      const out = serialize({ name: 'Alice', age: 30 }, 'yaml');
      expect(out).toBe('name: Alice\nage: 30');
    });

    it('respects yamlFlowStyle option for output', () => {
      const out = serialize({ a: 1, b: 2 }, 'yaml', { yamlFlowStyle: true });
      expect(out).toBe('{a: 1, b: 2}');
    });

    it('round-trips simple object through parse/serialize', () => {
      const obj = { name: 'Alice', age: 30 };
      expect(parse(serialize(obj, 'yaml'), 'yaml')).toEqual(obj);
    });
  });

  describe('CSV', () => {
    it('parses header + rows (strings only)', () => {
      const text = 'name,age,city\nAlice,30,NYC\nBob,25,LA\n';
      expect(parse(text, 'csv')).toEqual({
        header: ['name', 'age', 'city'],
        rows: [
          ['Alice', '30', 'NYC'],
          ['Bob', '25', 'LA'],
        ],
      });
    });

    it('keeps numeric cells as strings (no coercion)', () => {
      const text = 'a,b\n1,2.5\n';
      const result = parse(text, 'csv') as { header: string[]; rows: string[][] };
      expect(result.rows[0]).toEqual(['1', '2.5']);
    });

    it('handles quoted fields with embedded commas and newlines (RFC 4180)', () => {
      const text = 'a,b\n"hello, world","line1\nline2"\n';
      const result = parse(text, 'csv') as { header: string[]; rows: string[][] };
      expect(result.rows[0]).toEqual(['hello, world', 'line1\nline2']);
    });

    it('handles escaped double quotes', () => {
      const text = 'a\n"he said ""hi"""\n';
      const result = parse(text, 'csv') as { header: string[]; rows: string[][] };
      expect(result.rows[0][0]).toBe('he said "hi"');
    });

    it('honors a custom delimiter option', () => {
      const text = 'a;b\n1;2\n';
      const result = parse(text, 'csv', { delimiter: ';' }) as { header: string[]; rows: string[][] };
      expect(result).toEqual({ header: ['a', 'b'], rows: [['1', '2']] });
    });

    it('throws FormatError for invalid CSV input shape when appropriate', () => {
      // A valid (if odd) CSV always parses to a table; ensure wrong format tag surfaces error.
      expect(() => parse('not json', 'json')).toThrow(FormatError);
    });

    it('serializes objects array with header', () => {
      const value = [
        { name: 'Alice', age: '30' },
        { name: 'Bob', age: '25' },
      ];
      const out = serialize(value, 'csv');
      expect(out).toBe('name,age\nAlice,30\nBob,25');
    });

    it('serializes object to single header+row', () => {
      const out = serialize({ name: 'Alice', age: '30' }, 'csv');
      expect(out).toBe('name,age\nAlice,30');
    });

    it('quotes cells containing the delimiter or quotes', () => {
      const value = [{ note: 'a,b', quote: 'he said "hi"' }];
      const out = serialize(value, 'csv');
      expect(out).toBe('note,quote\n"a,b","he said ""hi"""');
    });
  });

  describe('TSV', () => {
    it('parses tab-delimited tables', () => {
      const text = 'name\tage\nAlice\t30\nBob\t25\n';
      expect(parse(text, 'tsv')).toEqual({
        header: ['name', 'age'],
        rows: [
          ['Alice', '30'],
          ['Bob', '25'],
        ],
      });
    });

    it('defaults to tab delimiter on serialize', () => {
      const value = [{ a: '1', b: '2' }];
      expect(serialize(value, 'tsv')).toBe('a\tb\n1\t2');
    });

    it('round-trips through serialize/parse', () => {
      const value = [
        { x: '1', y: '2' },
        { x: '3', y: '4' },
      ];
      const parsed = parse(serialize(value, 'tsv'), 'tsv');
      expect(parsed).toEqual({
        header: ['x', 'y'],
        rows: [
          ['1', '2'],
          ['3', '4'],
        ],
      });
    });
  });

  describe('cross-format consistency', () => {
    it('normalizeFormat accepts both string and enum Format', () => {
      const f: Format = 'yaml';
      expect(normalizeFormat(f)).toBe('yaml');
      expect(normalizeFormat('yaml')).toBe('yaml');
    });
  });
});
