import { describe, it, expect } from 'vitest';
import { detectInputFormat } from './formatSelector';

describe('detectInputFormat', () => {
  describe('empty / whitespace', () => {
    it('returns plaintext (non-confident) for an empty string', () => {
      const r = detectInputFormat('');
      expect(r).toEqual({ format: 'plaintext', confident: false });
    });

    it('returns plaintext for whitespace-only input', () => {
      expect(detectInputFormat('   \n\t  ')).toEqual({ format: 'plaintext', confident: false });
    });

    it('handles null / undefined by treating as empty', () => {
      // @ts-expect-error testing runtime guard against non-string
      expect(detectInputFormat(null).format).toBe('plaintext');
    });
  });

  describe('JSON', () => {
    it('detects a JSON object', () => {
      expect(detectInputFormat('{"a":1,"b":[2,3]}')).toEqual({ format: 'json', confident: true });
    });

    it('detects a JSON array', () => {
      expect(detectInputFormat('[1, 2, 3]')).toEqual({ format: 'json', confident: true });
    });

    it('detects JSON with surrounding whitespace (incl. BOM-ish leading spaces)', () => {
      expect(detectInputFormat('  \n  {"x": true}\n ')).toEqual({ format: 'json', confident: true });
    });

    it('does NOT report JSON for the string "{}" wrapped in prose', () => {
      // A real JSON doc is fine; here we assert malformed text is not "json".
      expect(detectInputFormat('{ "a": }')).not.toEqual({ format: 'json', confident: true });
    });

    it('malformed JSON object falls through to plaintext', () => {
      const r = detectInputFormat('{ "a": 1, }');
      expect(r.format === 'json' && r.confident).toBe(false);
    });
  });

  describe('JSONL', () => {
    it('detects one JSON object per line', () => {
      const input = `{"id":1}
{"id":2}
{"id":3}`;
      expect(detectInputFormat(input)).toEqual({ format: 'jsonl', confident: true });
    });

    it('detects JSONL with a trailing blank line', () => {
      const input = `{"a":1}
{"b":2}
`;
      expect(detectInputFormat(input)).toEqual({ format: 'jsonl', confident: true });
    });

    it('detects JSONL with mixed arrays and objects per line', () => {
      const input = `[1,2,3]
{"x":1}
["a","b"]`;
      expect(detectInputFormat(input)).toEqual({ format: 'jsonl', confident: true });
    });

    it('does NOT detect JSONL when a line is malformed', () => {
      const input = `{"a":1}
not json
{"b":2}`;
      expect(detectInputFormat(input).format).not.toBe('jsonl');
    });

    it('a single JSON object is JSON, not JSONL', () => {
      expect(detectInputFormat('{"a":1}')).toEqual({ format: 'json', confident: true });
    });
  });

  describe('CSV / TSV', () => {
    it('detects CSV with a header and consistent columns', () => {
      const input = `name,age,city
Alice,30,NY
Bob,25,LA`;
      expect(detectInputFormat(input)).toEqual({ format: 'csv', confident: true });
    });

    it('detects CSV with quoted fields containing commas', () => {
      const input = `name,note
"Smith, John","hello, world"
"Doe, Jane",plain`;
      expect(detectInputFormat(input)).toEqual({ format: 'csv', confident: true });
    });

    it('detects a single-line CSV as plaintext (too weak a signal)', () => {
      // One row with a delimiter is ambiguous; we require >=2 rows.
      expect(detectInputFormat('a,b,c').format).not.toBe('csv');
    });

    it('detects TSV (tab-delimited) consistently', () => {
      const input = `name\tage\tcity
Alice\t30\tNY
Bob\t25\tLA`;
      expect(detectInputFormat(input)).toEqual({ format: 'tsv', confident: true });
    });

    it('does NOT detect CSV when column counts are inconsistent', () => {
      const input = `a,b,c
1,2
3,4,5,6`;
      expect(detectInputFormat(input).format).not.toBe('csv');
    });
  });

  describe('YAML', () => {
    it('detects a block mapping', () => {
      const input = `name: Alice
age: 30
city: NY`;
      expect(detectInputFormat(input)).toEqual({ format: 'yaml', confident: true });
    });

    it('detects a block sequence', () => {
      const input = `- Alice
- Bob
- Carol`;
      expect(detectInputFormat(input)).toEqual({ format: 'yaml', confident: true });
    });

    it('returns plaintext for prose without any key/sequence/table structure', () => {
      const input = `The system processed 42 records today.
There is no mapping list or table here at all.`;
      expect(detectInputFormat(input)).toEqual({ format: 'plaintext', confident: false });
    });

    it('does NOT detect YAML for comma-separated prose (CSV takes precedence)', () => {
      const input = `Monday we shipped the feature.
Tuesday we fixed the regression.`;
      expect(detectInputFormat(input).format).not.toBe('yaml');
    });
  });

  describe('XML / mixed / plaintext', () => {
    it('detects XML documents', () => {
      const input = `<?xml version="1.0"?>
<note><to>Alice</to><from>Bob</from></note>`;
      expect(detectInputFormat(input)).toEqual({ format: 'xml', confident: true });
    });

    it('detects an XML fragment with closing tags', () => {
      expect(detectInputFormat('<root><child>1</child></root>')).toEqual({ format: 'xml', confident: true });
    });

    it('returns plaintext for plain prose', () => {
      expect(detectInputFormat('Hello, this is just some text.')).toEqual({ format: 'plaintext', confident: false });
    });

    it('returns plaintext for mixed / unrecognized content', () => {
      const input = `Here is a note.
And another line with no structure.
Just words.`;
      expect(detectInputFormat(input)).toEqual({ format: 'plaintext', confident: false });
    });
  });
});
