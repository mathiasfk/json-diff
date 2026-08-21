# Feasibility: JSONL (JSON Lines) comparison

Status: **GO — low effort, high reuse.** JSONL is the cheapest format to add
because it is just an array of JSON values written one-per-line. The existing
diff engine already treats "top-level array of JSON values" as its primary
case, so most of the work is parsing + a thin UI mode, not new comparison logic.

Scope of this document: the four points in task t_733b7e15. The consolidated
doc (docs/feasibility-content-comparison.md) compares JSONL and YAML.

## 1. Parsing strategy

JSONL = newline-delimited JSON. Each line is an independent JSON value
(object, array, primitive, or null). Two parsing modes:

- **Strict (recommended):** split on `\n` (and `\r\n`), trim empty lines,
  `JSON.parse` each non-empty line. On first bad line, surface the 1-based
  line number in the error. Reuses the exact `JSON.parse` already used in
  `App.tsx` `validateAndParse` (`src/App.tsx:89`), so no new parser dependency.
- **Lenient:** same, but skip blank/whitespace-only lines silently. Recommended
  default because trailing newlines are common.

Reuse: no new dependency needed. `JSON.parse` is already the project's parser.
We only add the line-splitting loop. Avoid a streaming JSON parser (e.g.
`stream-json`) during evaluation — it adds a dep and complexity we don't need
for the common case (see §4).

Suggested helper (no behavior change to existing code):

```ts
// src/utils/jsonl.ts
export interface JsonlParseResult {
  ok: boolean;
  value?: unknown[];   // array of parsed lines
  error?: { line: number; message: string };
}

export function parseJsonl(text: string): JsonlParseResult {
  const lines = text.split(/\r?\n/);
  const out: unknown[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;            // tolerate blank lines
    try {
      out.push(JSON.parse(line));
    } catch (e) {
      return { ok: false, error: { line: i + 1, message: (e as Error).message } };
    }
  }
  if (out.length === 0) return { ok: false, error: { line: 0, message: 'Empty JSONL' } };
  return { ok: true, value: out };
}
```

## 2. Comparison semantics — line-by-line vs whole document

Two coherent options; **recommend line-by-line as the default, whole-document as
the fallback**:

### Option A — Whole document (RECOMMENDED, zero new logic)
Treat the parsed JSONL as a single top-level **array** `[line1, line2, ...]` and
feed it straight into the existing `semanticDiff(leftArray, rightArray)`
(`src/utils/semanticDiff.ts:330`). This is the highest-reuse path:

- Array-of-objects alignment (`alignArraysForDiff`, `semanticDiff.ts:99`) already
  handles id-based vs content-based matching, move detection, and nested
  normalization.
- Primitives vs objects are already discriminated.
- The DiffViewer / Monaco rendering needs no change — it already shows two
  normalized JSON documents (`App.tsx:120-137`).

Downside: if the two files have different line counts, jsondiffpatch reports
insertions/deletions at array positions, which reads as "line added/removed"
anyway — semantically correct.

### Option B — Line-by-line pairing
Pair line N of left with line N of right, diff each pair independently, and
aggregate. This gives precise "line 5 changed" granularity even when total
counts differ. Useful when each line is a self-contained record and the user
cares about positional correspondence.

- **Not recommended as the only mode** because it bypasses the smarter
  array-alignment (id matching, moves) that makes this tool good.
- If wanted later, it can be layered on top: loop `semanticDiff(left[i], right[i])`.

**Recommendation:** ship Option A (whole-document array diff) first. It is the
natural fit for the engine and needs no new comparison code. Keep Option B as a
future enhancement gated behind a toggle.

## 3. Can existing JSON normalization be reused?

**Yes — almost entirely.** The normalization pipeline in `semanticDiff.ts` is
format-agnostic; it operates on parsed JS values, not on text:

- `normalizeForDiff` (`semanticDiff.ts:188`) — pair-aware array alignment +
  property sorting. Pure data, reused as-is.
- `normalizeForDisplay` (`semanticDiff.ts:232`) — single-side sort for the
  "Format" button. Reused as-is for JSONL too.
- `sortObjectProperties` / `detectArrayMatchField` / `calculateSimilarity` in
  `jsonNormalizer.ts` — all value-level, reused as-is.

The ONLY new normalization concern is at the **line level** for Option B: when
pairing line N→N, we may want to normalize each line's key order before diffing
so that `{"a":1,"b":2}` and `{"b":2,"a":1}` on the same line count as unchanged.
That is already solved by calling `sortObjectProperties` per line — a one-liner,
no new algorithm.

No changes to `jsonNormalizer.ts` or the core `semanticDiff` are required for
Option A. This is the strongest argument for GO.

## 4. Streaming / chunking for large files

**Not required for the initial feature; revisit only past a real threshold.**

- The current architecture holds both full parsed values in memory (React state
  in `App.tsx`). JSONL of, say, 100k short lines = ~tens of MB text and a few-MB
  array — fine for the browser in the common case.
- For very large files the future work is:
  1. **Parse lazily / in a Web Worker** to avoid blocking the UI thread. The
     `parseJsonl` loop above is trivially movable to a worker.
  2. **Chunk comparison:** diff in windows of N lines, render a row-level diff
     summary (added/removed/changed per line) without building one giant jsondiff
     delta. This is an enhancement, not a blocker.
- No streaming lib is needed now. Recommend: ship in-memory, add a guard that
  warns (not errors) above ~50k lines, and track chunking as a separate task.

## Reuse summary

| Existing piece | Reuse for JSONL |
|---|---|
| `JSON.parse` (`App.tsx:89`) | Yes — per line |
| `semanticDiff` (`semanticDiff.ts:330`) | Yes — feed `[lines]` array (Option A) |
| `normalizeForDiff` / `normalizeForDisplay` | Yes — unchanged |
| `jsonNormalizer.ts` helpers | Yes — unchanged |
| `DiffViewer` / Monaco | Yes — unchanged (renders two arrays) |
| New code required | Only `parseJsonl` + a JSONL mode toggle in `App.tsx` |

## Effort estimate

**S (small).** Roughly: one new ~40-line `src/utils/jsonl.ts`, a UI toggle in
`App.tsx` to switch input mode (JSON ↔ JSONL), and plumbing the parsed array into
the existing `semanticDiff`. No new deps, no changes to the comparison core.

## Recommended approach (go)

1. Add `src/utils/jsonl.ts` with `parseJsonl` (strict + lenient, line-numbered
   errors).
2. Add a JSONL mode selector in `App.tsx`; in JSONL mode, parse both sides with
   `parseJsonl` and pass the resulting arrays to `semanticDiff` (Option A).
3. Surface JSONL parse errors with the offending 1-based line number.
4. Reuse `formatJSON` / `DiffViewer` unchanged.
5. Defer line-by-line (Option B) and streaming/chunking to later tasks.

## Open questions (non-blocking)

- Should JSONL mode also accept a "paired line-by-line" toggle? (Recommend: no
  for v1.)
- Line-ending policy: tolerate trailing newline + blank lines (recommended yes).
- File size guard threshold (recommend warn at ~50k lines).
