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
      expect(SUPPORTED_FORMATS).toEqual(['json', 'jsonl', 'yaml']);
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

  describe('cross-format consistency', () => {
    it('normalizeFormat accepts both string and enum Format', () => {
      const f: Format = 'yaml';
      expect(normalizeFormat(f)).toBe('yaml');
      expect(normalizeFormat('yaml')).toBe('yaml');
    });
  });
});
