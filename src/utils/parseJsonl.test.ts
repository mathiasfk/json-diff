import { describe, it, expect } from 'vitest';
import { parse, FormatError } from './formatSelector';

/**
 * Tests for the hardened JSONL parser (parseJsonl).
 *
 * The parser enforces the JSONL spec strictly: exactly one self-contained JSON
 * value per line. Pretty-printed / multi-line JSON objects are rejected with a
 * clear line/column error, rather than silently mis-parsed. This keeps behavior
 * simple and correct (option (a) from the task spec).
 */
describe('parseJsonl (strict validation)', () => {
  it('parses valid JSONL: one object per line', () => {
    const text = '{"id":1}\n{"id":2}\n{"id":3}\n';
    expect(parse(text, 'jsonl')).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('parses a mix of JSON value types per line', () => {
    const text = '{"a":1}\n[1,2,3]\n"string"\n42\nnull\n';
    expect(parse(text, 'jsonl')).toEqual([{ a: 1 }, [1, 2, 3], 'string', 42, null]);
  });

  it('skips blank lines between records', () => {
    const text = '{"a":1}\n\n\n{"a":2}\n';
    expect(parse(text, 'jsonl')).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('tolerates trailing whitespace on a valid line', () => {
    const text = '{"a":1}   \n{"b":2}\t\n';
    expect(parse(text, 'jsonl')).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('tolerates CRLF line endings', () => {
    const text = '{"a":1}\r\n{"b":2}\r\n';
    expect(parse(text, 'jsonl')).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('rejects pretty-printed / multi-line JSON objects', () => {
    const text = '{\n  "a": 1,\n  "b": 2\n}\n';
    try {
      parse(text, 'jsonl');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(FormatError);
      const fe = e as FormatError;
      expect(fe.format).toBe('jsonl');
      expect(fe.line).toBe(1);
      expect(fe.message).toContain('line 1');
      expect(fe.message).toMatch(/one complete JSON value per line/i);
    }
  });

  it('reports the offending line number for a malformed value later in the file', () => {
    const text = '{"ok":1}\nnot json\n';
    try {
      parse(text, 'jsonl');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(FormatError);
      const fe = e as FormatError;
      expect(fe.format).toBe('jsonl');
      expect(fe.line).toBe(2);
      expect(fe.message).toContain('line 2');
    }
  });

  it('rejects a line with a complete value followed by trailing content', () => {
    const text = '{"a":1} {"b":2}\n';
    try {
      parse(text, 'jsonl');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(FormatError);
      const fe = e as FormatError;
      expect(fe.line).toBe(1);
      expect(fe.message).toContain('exactly one JSON value');
    }
  });

  it('includes column context in the error message', () => {
    // Leading whitespace then a broken object: column should account for the indent.
    const broken = '  {bad}\n';
    try {
      parse(broken, 'jsonl');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(FormatError);
      expect((e as FormatError).message).toMatch(/column [23]/);
    }
  });

  it('returns an empty array for empty/whitespace-only input', () => {
    expect(parse('', 'jsonl')).toEqual([]);
    expect(parse('\n\n   \n', 'jsonl')).toEqual([]);
  });
});
