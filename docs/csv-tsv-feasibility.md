# CSV / TSV Comparison — Feasibility Assessment

**Task:** t_6c61db57 — Evaluate CSV/TSV comparison feasibility
**Status:** FEASIBLE (low risk) — no changes to the diffing algorithm required
**Date:** 2026-08-17

---

## 1. Summary

Adding CSV/TSV support is **feasible with minimal engineering effort and zero risk to the
existing JSON engine**. The current `semanticDiff` implementation (jsondiffpatch + the
custom smart array-matching layer in `src/utils/semanticDiff.ts`) already does everything a
tabular comparison needs: it matches array items by a unique id-like column, falls back to
content-based matching, normalizes property/array order, and emits a structured delta that the
Monaco diff viewer already renders.

The only genuinely new work is **parsing** the flat text format into a structured model and
**plumbing** that model through the existing UI. The diff semantics, array matching, and
visualization are reused unchanged.

This was validated empirically with a throwaway test suite (6 cases) run against the real
`semanticDiff` engine — all passed. See section 7.

---

## 2. Parsing strategy — structured tabular model (NOT text diff)

Recommendation: **parse into structured data, then reuse the JSON diff engine.** Do NOT do a
line-by-line text diff.

A tabular file maps naturally onto the data shapes the engine already handles:

```ts
interface TableModel {
  columns: string[];                       // header row
  rows: Record<column, string>[];          // one object per data row
}
```

Rationale:
- `columns` is an array of primitives → the existing primitive-array sorting/comparison
  (by string value) handles added/removed/renamed columns.
- `rows` is an array of objects → `findUniqueKeyCommonToBoth` + `alignArraysForDiff` in
  `semanticDiff.ts` will automatically match rows by a unique id-like column (e.g. `id`) and
  fall back to content matching otherwise. Reordered rows therefore produce **no spurious
  diff**, exactly like reordered JSON array items already do.
- Each cell becomes a string property → cell edits show up as precise nested property changes
  in the delta, which the Monaco diff view renders with line-level precision.

This is strictly better than a text diff: a text diff reports that "line 5 changed" for both a
reordered row and an edited cell, whereas the structured model pinpoints the exact column/row.

---

## 3. Comparison semantics — row/column aware

| Change type        | How the model represents it        | Engine behavior (verified)                        |
|--------------------|------------------------------------|---------------------------------------------------|
| Reordered rows     | Same `rows` objects, new order     | No diff (matched by id column)                    |
| Edited cell        | One property value changed in a row| Nested property delta at `rows[i][column]`         |
| Added/removed row  | New/fewer object in `rows`         | Added/removed array item                           |
| Added/removed col  | `columns` array + per-row property | Column add/remove + per-row property add/remove    |
| Renamed column     | `columns` entry changed + values move | Treated as remove+add (acceptable; note below) |

Edge case — renamed column: because the model keys cells by column name, renaming a column
(e.g. `age` → `years`) shows as "remove `age`, add `years`" rather than a rename. This mirrors
how JSON key renames already behave in the current engine and is acceptable for v1. A rename
heuristic could be added later but is out of scope.

---

## 4. Format details to handle

### 4.1 Delimiter
- CSV → `,`; TSV → `\t`.
- **Recommendation:** explicit mode toggle (CSV / TSV) in the UI, with optional auto-detection
  from file extension (`.csv` / `.tsv`) and a fallback sniff of the first non-empty line. Keep
  detection simple — do not over-engineer.

### 4.2 Headers
- **Default:** first row is the header → becomes `columns`.
- **No-header mode (optional v1+):** synthesize `col_0, col_1, … col_N`. Needed for headerless
  exports. Recommend deferring until there is demand; add a checkbox if trivial.

### 4.3 Quoting / escaping
- **CSV:** implement RFC 4180 quoting — `"..."` fields, embedded `"` as `""`, newline-in-quotes
  allowed. The prototype used a minimal quote-aware parser that passed all cases; a small,
  well-tested parser is sufficient. Libraries are available (`csv-parse`, `papaparse`) but a
  ~40-line RFC 4180 parser keeps the dependency surface at zero and is easy to test.
- **TSV:** no standard quoting. Literal tabs/newlines inside a field break the format. Keep it
  simple: split on `\t` and `\n`; document the limitation. Do not add TSV quoting in v1.

### 4.4 Encoding
- Default to **UTF-8**. `FileReader`/`file.text()` already decodes as UTF-8 in the browser.
- Non-UTF-8 files (e.g. Latin-1) are out of scope for v1; can be added later with a
  configurable decoding step. Note the limitation in the UI/README.

### 4.5 Type coercion (recommendation: keep strings)
- Default: keep **all cells as strings**. This is deterministic, avoids `1` vs `"1"` ambiguity,
  and keeps the model simple.
- Optional v2 enhancement: best-effort numeric/boolean coercion toggle. Defer — adds matching
  complexity for little v1 value.

---

## 5. Large files / streaming

- **v1 scope:** in-memory parse. Browser `File` objects are read fully via `.text()` (already
  used in `JsonEditor.handleDrop`). Fine for typical files (MBs).
- **Future:** true streaming is non-trivial with the current full-model jsondiffpatch approach
  (it needs both sides fully materialized). If multi-GB files are a real need, options are:
  (a) row-windowed diffing (compare N rows at a time, report per-window deltas), or
  (b) a separate line-oriented diff path. Both are out of scope; flag as a known limitation.

---

## 6. UI / integration plan (recommended, minimal)

1. **File drop / paste:** extend `JsonEditor.handleDrop` to accept `.csv` / `.tsv`
   (`file.name.endsWith('.csv'|.tsv')`). Also accept pasted delimited text.
2. **Mode toggle:** add a small `CSV | TSV | JSON` selector near the editors. JSON remains the
   default so existing behavior is untouched.
3. **Transform step:** before `semanticDiff`, convert the parsed table model to `TableModel`
   and call the existing `semanticDiff(leftTable, rightTable)`. No change to `semanticDiff`
   itself.
4. **Diff view reuse:** the existing `DiffViewer` renders the normalized `left`/`right` JSON
   strings. Because the model is JSON-shaped, the Monaco diff view works unchanged — users see
   a clear, side-by-side column/row diff.
5. **Analytics:** keep the existing `gtag` events; optionally add `format` dimension.

This keeps the change **additive and isolated** — JSON comparison is never affected.

---

## 7. Empirical validation

A throwaway suite (`src/utils/_csvFeasibility.test.ts`) was run against the real engine and
**all 6 cases passed**:

1. Reordered rows (id-keyed) → no diff ✅
2. Modified cell → detected as nested property change ✅
3. Added row → detected ✅
4. Added column → detected in both `columns` and per-row `rows` ✅
5. TSV parse + diff → identical to CSV behavior ✅
6. `formatJSON` round-trip on the model → no error ✅

Conclusion: the engine's smart array matching already delivers row-aware comparison once data is
structurally a `rows[]` of objects. No algorithm change is required.

---

## 8. Open decisions (for the implementation task)

| # | Decision                                  | Recommendation            | Notes                          |
|---|-------------------------------------------|---------------------------|--------------------------------|
| D1 | Delimiter selection                       | explicit toggle + ext sniff | keep detection minimal       |
| D2 | Header handling                           | first row = header (v1)   | no-header mode deferred        |
| D3 | Parser implementation                     | zero-dep RFC4180 parser   | papaparse if tests get heavy   |
| D4 | Type coercion                             | strings only (v1)         | numeric toggle deferred        |
| D5 | Encoding                                 | UTF-8 default             | non-UTF-8 deferred             |
| D6 | Large files                              | in-memory (v1)            | streaming deferred, documented  |

---

## 9. Recommended next steps

1. **Implement** (`t_3c1a131b` / `t_f14aaccf` children): parser module `src/utils/delimited.ts`
   (RFC 4180 + TSV), a `TableModel` type, and a transform wrapper feeding `semanticDiff`.
2. **UI:** mode toggle + file-type acceptance in `JsonEditor`.
3. **Tests:** promote the prototype cases into `semanticDiff.scenarios.test.js` fixtures
   (add `test-data/csv-*/`) and add unit tests for the parser (quoting, empty cells, TSV).
4. **Docs:** update README "Features" + "Usage" with the CSV/TSV workflow.
