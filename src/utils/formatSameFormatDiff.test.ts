import { describe, it, expect } from 'vitest';
import { semanticDiff } from './semanticDiff';
import { parse, formatSameFormatDiff, SAME_FORMAT_DIFF_FORMATS, type Format } from './formatSelector';

/**
 * Acceptance coverage for "same-format diff output":
 * when leftFormat === rightFormat (yaml / json / jsonl), the normalized diff
 * objects are re-serialized back into that shared format so the diff viewer
 * shows the user's original dialect instead of canonical JSON.
 */

describe('formatSameFormatDiff', () => {
  it('exposes the three supported same-format diff dialects', () => {
    expect(SAME_FORMAT_DIFF_FORMATS).toEqual(['json', 'jsonl', 'yaml']);
  });

  it('returns null for unsupported formats (xml/plaintext) so callers fall back to JSON', () => {
    const left = { a: 1 };
    const right = { a: 2 };
    expect(formatSameFormatDiff(left, right, 'xml' as Format)).toBeNull();
    expect(formatSameFormatDiff(left, right, 'plaintext' as Format)).toBeNull();
  });

  it('returns null for unsupported formats so callers fall back to JSON', () => {
    const left = { a: 1 };
    const right = { a: 2 };
    expect(formatSameFormatDiff(left, right, 'xml' as Format)).toBeNull();
  });
});

describe('same-format diff output — YAML', () => {
  it('shows clean YAML with only semantic changes for reordered-but-equivalent input', () => {
    const left = `name: Alice
age: 30
hobbies:
  - reading
  - cycling`;

    const right = `age: 30
hobbies:
  - reading
  - cycling
name: Alice`;

    const parsedLeft = parse(left, 'yaml');
    const parsedRight = parse(right, 'yaml');
    const { left: normLeft, right: normRight } = semanticDiff(parsedLeft, parsedRight);

    const out = formatSameFormatDiff(normLeft, normRight, 'yaml');
    expect(out).not.toBeNull();

    const merged = out!.left + '\n---vs---\n' + out!.right;
    // No JSON artifacts in the output
    expect(merged).not.toContain('{');
    expect(merged).not.toContain('}');
    expect(merged).not.toContain('"');

    // Both sides are stable, canonical YAML (property order is normalized and
    // primitive arrays are deterministically sorted, so "cycling" < "reading").
    expect(out!.left).toBe(`age: 30
hobbies:
  - cycling
  - reading
name: Alice`);
    expect(out!.right).toBe(out!.left);
  });

  it('highlights only the semantic difference when a value changes', () => {
    const left = `name: Alice
age: 30`;
    const right = `name: Alice
age: 31`;

    const { left: normLeft, right: normRight } = semanticDiff(
      parse(left, 'yaml'),
      parse(right, 'yaml'),
    );
    const out = formatSameFormatDiff(normLeft, normRight, 'yaml');

    expect(out!.left).toBe(`age: 30
name: Alice`);
    expect(out!.right).toBe(`age: 31
name: Alice`);
  });
});

describe('same-format diff output — JSON', () => {
  it('produces canonical JSON for equivalent reordered objects', () => {
    const left = `{"name":"Alice","age":30}`;
    const right = `{"age":30,"name":"Alice"}`;

    const { left: normLeft, right: normRight } = semanticDiff(
      parse(left, 'json'),
      parse(right, 'json'),
    );
    const out = formatSameFormatDiff(normLeft, normRight, 'json');

    expect(out!.left).toBe('{\n  "age": 30,\n  "name": "Alice"\n}');
    expect(out!.right).toBe(out!.left);
  });
});

describe('same-format diff output — JSONL', () => {
  it('produces JSONL (one object per line) for equivalent records', () => {
    const left = `{"id":1,"name":"apple"}
{"id":2,"name":"banana"}`;
    const right = `{"name":"banana","id":2}
{"name":"apple","id":1}`;

    const { left: normLeft, right: normRight } = semanticDiff(
      parse(left, 'jsonl'),
      parse(right, 'jsonl'),
    );
    const out = formatSameFormatDiff(normLeft, normRight, 'jsonl');

    // Array of two objects -> two JSON lines, property order normalized.
    expect(out!.left).toBe('{"id":1,"name":"apple"}\n{"id":2,"name":"banana"}\n');
    expect(out!.right).toBe(out!.left);
  });

  it('highlights only the changed line for a single JSONL record', () => {
    const left = `{"id":1,"name":"apple"}`;
    const right = `{"id":1,"name":"pear"}`;

    const { left: normLeft, right: normRight } = semanticDiff(
      parse(left, 'jsonl'),
      parse(right, 'jsonl'),
    );
    const out = formatSameFormatDiff(normLeft, normRight, 'jsonl');

    expect(out!.left).toBe('{"id":1,"name":"apple"}\n');
    expect(out!.right).toBe('{"id":1,"name":"pear"}\n');
  });
});
