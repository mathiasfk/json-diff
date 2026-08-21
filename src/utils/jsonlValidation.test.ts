import { describe, it, expect } from 'vitest';
import { validateJsonlLines, isTextValidJsonl } from './jsonlValidation';

describe('validateJsonlLines', () => {
  it('accepts well-formed single-line JSON records', () => {
    const text = '{"id":1}\n{"id":2}\n{"id":3}';
    expect(validateJsonlLines(text)).toEqual([]);
    expect(isTextValidJsonl(text)).toBe(true);
  });

  it('accepts scalar JSON values per line', () => {
    const text = '1\n"two"\ntrue\nnull\n[1,2,3]';
    expect(validateJsonlLines(text)).toEqual([]);
  });

  it('skips blank lines between records', () => {
    const text = '{"a":1}\n\n{"b":2}\n   \n{"c":3}';
    expect(validateJsonlLines(text)).toEqual([]);
  });

  it('flags a pretty-printed (multi-line) object: every line except the first is invalid', () => {
    const text = '{\n  "a": 1,\n  "b": 2\n}';
    const errors = validateJsonlLines(text);
    // line 1 is an incomplete object; lines 2-4 are incomplete too
    expect(errors.length).toBeGreaterThan(0);
    // every reported line should be in 1..4
    errors.forEach((e) => expect(e.lineNumber).toBeGreaterThanOrEqual(1));
    expect(errors.map((e) => e.lineNumber)).toContain(2);
    expect(isTextValidJsonl(text)).toBe(false);
  });

  it('flags a line that is not complete JSON (trailing content)', () => {
    const text = '{"a":1} {"b":2}';
    const errors = validateJsonlLines(text);
    expect(errors).toHaveLength(1);
    expect(errors[0].lineNumber).toBe(1);
  });

  it('flags a single malformed line with its number', () => {
    const text = '{"id":1}\nnot json\n{"id":3}';
    const errors = validateJsonlLines(text);
    expect(errors).toHaveLength(1);
    expect(errors[0].lineNumber).toBe(2);
    expect(errors[0].message).toBeTruthy();
  });

  it('returns no errors for empty input', () => {
    expect(validateJsonlLines('')).toEqual([]);
    expect(validateJsonlLines('\n\n')).toEqual([]);
  });
});
