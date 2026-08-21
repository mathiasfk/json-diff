import { describe, it, expect } from 'vitest';
import { parse, FormatError } from './formatSelector';

/**
 * Regression + diagnosis coverage for the JSONL pretty-print parse failure.
 *
 * JSONL (JSON Lines) requires exactly ONE JSON value per physical line: no
 * multi-line pretty-printing, no trailing commas, no comments. When a user
 * copy-pastes a pretty-printed object (e.g. straight out of Monaco's default
 * pretty-print view) into a JSONL editor, `parseJsonl` splits on newlines and
 * `JSON.parse`s each physical line in isolation, so every intermediate line is
 * invalid JSON on its own.
 *
 * Verified runtime behavior of the current parser (parseJsonl in
 * src/utils/formatSelector.ts):
 *
 *  1. A typical pretty-printed object throws on LINE 1 with the message
 *     "Expected property name or '}' in JSON at position 1 (line 1 column 2)",
 *     because the first line is just "{" which is an unterminated object. The
 *     parser never reaches the later lines.
 *
 *  2. The message named in the diagnosis task —
 *     "Unexpected non-whitespace character after JSON at position ..." — is the
 *     error JSON.parse emits whenever a SINGLE line holds a complete value
 *     followed by trailing content (e.g. `{"a":1} {"b":2}`). The parser
 *     surfaces that exact string verbatim. In a pretty object this message
 *     would appear on the 2nd line, but the parser has already thrown on line 1.
 *
 * This file locks in the CURRENT (failing) behavior. The follow-up task
 * t_65a76295 is expected to make JSONL tolerant of pretty-printed input (or
 * auto-detect JSON and normalize), at which point the "throws" cases below
 * should be flipped to "parses" cases.
 */

const PRETTY_OBJECT = `{
  "name": "Alice",
  "age": 30,
  "address": {
    "city": "Lisbon",
    "zip": "1000-001"
  }
}`;

// A single JSONL line that is a complete value followed by trailing content.
const COMPLETE_VALUE_THEN_TRAILING = `{"a":1} {"b":2}`;

describe('JSONL with pretty-printed (multi-line) input', () => {
  it('throws a FormatError for a pretty-printed object', () => {
    expect(() => parse(PRETTY_OBJECT, 'jsonl')).toThrow(FormatError);
  });

  it('reports the failure on line 1 (the unterminated "{" line)', () => {
    try {
      parse(PRETTY_OBJECT, 'jsonl');
      throw new Error('expected parse() to throw for pretty-printed JSONL');
    } catch (e) {
      expect(e).toBeInstanceOf(FormatError);
      const err = e as FormatError;
      expect(err.format).toBe('jsonl');
      expect(err.line).toBe(1);
      // The first physical line is just "{" which is an unterminated object,
      // so JSON.parse fails here before the later trailing-content lines.
      expect(err.message).toMatch(/Expected property name or '}' in JSON at position/i);
    }
  });

  it('surfaces the "unexpected non-whitespace character after JSON" message verbatim for trailing-content lines', () => {
    // This is the exact message string referenced in the diagnosis task. It is
    // what JSON.parse emits when a line holds a complete value followed by more
    // non-whitespace content — the underlying cause of the JSONL failure class.
    try {
      parse(COMPLETE_VALUE_THEN_TRAILING, 'jsonl');
      throw new Error('expected parse() to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(FormatError);
      const err = e as FormatError;
      expect(err.format).toBe('jsonl');
      expect(err.line).toBe(1);
      expect(err.message).toMatch(/unexpected non-whitespace character after JSON at position/i);
    }
  });

  it('throws even for a single pretty-printed object that is already valid JSON in json mode', () => {
    // Same text is valid JSON...
    expect(() => parse(PRETTY_OBJECT, 'json')).not.toThrow();
    // ...but in JSONL mode each line is parsed separately, so it fails.
    expect(() => parse(PRETTY_OBJECT, 'jsonl')).toThrow(FormatError);
  });
});

describe('JSONL spec expectations (documented)', () => {
  it('one valid JSON value per line is accepted', () => {
    expect(parse('{"a":1}\n{"b":2}', 'jsonl')).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('blank lines between records are skipped, not treated as errors', () => {
    expect(parse('{"a":1}\n\n{"b":2}\n', 'jsonl')).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('trailing commas are NOT valid JSONL (per spec) and therefore fail', () => {
    expect(() => parse('{"a":1},\n{"b":2}', 'jsonl')).toThrow(FormatError);
  });

  it('whole-line // comments are NOT valid JSONL (per spec) and therefore fail', () => {
    expect(() => parse('// a comment\n{"a":1}', 'jsonl')).toThrow(FormatError);
  });
});
