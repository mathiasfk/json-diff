# YAML Comparison Feasibility — Notes

**Status:** GO (recommended)
**Scope:** Assess adding YAML support to the JSON diff tool.
**Date:** 2026-08-17
**Author:** dev (kanban t_8d1b709b)

---

## 1. Verdict

**Feasible and low-risk.** YAML is a superset of JSON, and the entire diff
engine operates on *parsed JavaScript values* — not on text. The only
JSON-specific code in the app is the `JSON.parse` call at the input boundary
(`validateAndParse` in `src/App.tsx`). Replacing that boundary with a YAML
parser that yields the same JS value shape makes the rest of the pipeline
(YAML → JS value → `semanticDiff` → `jsondiffpatch` → `formatJSON`) work
**unchanged**. No changes to `semanticDiff.ts`, `jsonNormalizer.ts`, or
`DiffViewer.tsx` are required for the core comparison.

---

## 2. Where YAML plugs in (architecture map)

Current input flow (see `docs/architecture.md`, "Data Flow"):

```
User Input (JSON string)
  → validateAndParse()        [JSON.parse]        ← ONLY JSON-specific step
  → semanticDiff(left, right)  [normalization + jsondiffpatch]
  → formatJSON()              [display normalization]
  → DiffViewer (Monaco)
```

Target flow for YAML:

```
User Input (YAML string)
  → validateAndParse()        [yaml.parse with format autodetect]
  → semanticDiff(...)          ← reused as-is
  → formatJSON(...)            ← reused as-is
  → DiffViewer                 ← reused as-is
```

The diff algorithm is **format-agnostic** by construction. `semanticDiff`
recurses over plain objects / arrays / primitives, which is exactly what a
YAML parser produces.

---

## 3. Parsing strategy

Use a real YAML parser, not `JSON.parse`. Verified candidates (npm, 2026-08-17):

| Library      | Latest | Notes |
|--------------|--------|-------|
| `yaml`       | 2.9.0  | ESM-first, has `parse` + `parseAllDocuments` for multi-doc. **Recommended.** |
| `js-yaml`    | 5.3.0  | Mature, `load`/`loadAll`. Common older choice. |

A small adapter at the boundary is enough:

```ts
import { parse, parseAllDocuments } from 'yaml';

export type ParseResult =
  | { valid: true; parsed: unknown; docs?: unknown[]; format: 'yaml' | 'json' }
  | { valid: false; error: string };

// JSON is valid YAML (superset). Probe confirmed `{"a":1}` parses via yaml.parse.
export function parseInput(text: string): ParseResult {
  if (!text.trim()) return { valid: false, error: 'Input cannot be empty' };
  // Multi-document YAML -> array of docs.
  const docs = parseAllDocuments(text);
  // Reject the whole input if ANY document fails to parse (authoritative errors).
  for (const d of docs) {
    const err = d.errors[0];
    if (err) return { valid: false, error: err.message };
  }
  const values = docs.map((d) => d.toJS());
  const parsed = values.length === 1 ? values[0] : values;
  return { valid: true, parsed, docs: values, format: 'yaml' };
}
```

Both `JSON.parse` and `yaml.parse` accept valid JSON text, so a single
`parseInput` entry point can replace the existing `validateAndParse` without
needing to detect the input format explicitly. This also keeps JSON behavior
identical (zero regression risk for existing users).

---

## 4. YAML-specific features & how each is handled

### 4.1 Anchors & aliases (`&anchor`, `*alias`)
**Finding (verified):** Resolved at parse time. `yaml.parse` expands the
aliased value inline, so the diff sees a fully-materialized tree. Identical
values defined via `*alias` are indistinguishable from duplicated literals
after parse — which is the *desired* semantic behavior for a content diff.

Caveat: Information that two nodes shared an anchor is lost after parse, so
the diff cannot report "these are the same anchor." Acceptable; the tool is
semantic, not structural-source-aware.

### 4.2 Merge keys (`<<`)
**Finding (verified — important):** `yaml.parse` does **NOT** auto-merge
`<<` keys. The merged map keeps a literal `"<<"` property holding the merged
object. Example parsed output:

```json
{ "prod": { "<<": { "adapter": "postgres", "port": 5432 }, "host": "prod.db" } }
```

**Decision required:** Either
(a) document that `<<` appears as a real key (simplest, no code), or
(b) enable YAML merge-key resolution (`yaml` supports it via
`parse(doc, { merge: true })`) so the key is folded into its parent before
diffing. Option (b) gives cleaner, more intuitive diffs and is recommended.

### 4.3 Multi-document YAML (`---` separators)
**Finding (verified):** `parseAllDocuments` cleanly yields N documents.
A comparison of two multi-doc inputs needs a pairing strategy:

- If both sides have the same number of docs → pair doc-by-doc (like
  array-of-objects alignment, reuse `alignArraysForDiff` logic conceptually).
- If counts differ or a side is single-doc → fall back to comparing the
  whole input as a sequence of documents (wrap each side in an array).

For a v1, the simplest correct behavior: if EITHER side is multi-doc, treat
each side as an **array of documents** and compare those two arrays with the
existing array logic. This requires no new algorithm.

### 4.4 Scalar styles, quoting, comments, key order
**Finding (verified):** All of these are textual and are discarded by the
parser. YAML `key: value` order is not guaranteed after parse, and comments
(`#`) vanish. This is **fully compatible** with the existing tool, which
already normalizes (sorts object properties, sorts arrays) before diffing
and is explicitly semantic, not byte-exact.

Consequence: two YAML files that are semantically identical but differ in
quoting/comments/key-order will show **no differences** — consistent with
current JSON behavior (JSON key order is already ignored).

### 4.5 Type inference
**Finding (verified):** `yaml.parse` produces correct JS types:
`42` → number, `3.14` → number, `true` → boolean, `~`/null → null,
`"text"` → string. **Bare dates (`2026-08-17`) remain strings**, not `Date`
objects.

Risk: a value written as `2026-08-17` in YAML but as a quoted string in
JSON would type-mismatch. This is inherent to YAML and acceptable; users
comparing YAML-to-YAML get consistent typing. For YAML-vs-JSON comparisons,
the existing `typeof`/serialization hashing in `semanticDiff` handles
mismatches as value changes (no crash).

---

## 5. Normalization approach

No new normalization is needed for the core. The existing `sortObjectProperties`
and `normalizeForDiff`/`normalizeForDisplay` already operate on the parsed
value tree. Two optional refinements:

1. **Merge-key folding** (section 4.2b) — run once at parse time, before
   handing to `semanticDiff`. Keeps diff output clean.
2. **Multi-doc array wrapping** (section 4.3) — wrap parsed docs in an array
   when either side is multi-doc, then rely on existing array alignment.

Both are pre-processing steps at the boundary, not changes to the algorithm.

---

## 6. Library availability (verified)

- `yaml@2.9.0`: installable via pnpm, ESM, exports `parse`,
  `parseAllDocuments`, `stringify`. **Selected.**
- `js-yaml@5.3.0`: installable, alternative.
- `yaml-types`: available but **not needed** (custom type tags are out of
  scope for v1).

No native dependencies; both are pure JS and work with Vite/ESM and the
existing `vitest` setup.

---

## 7. UI / UX considerations

- `validateAndParse` is called from `App.tsx` for both `handleCompare` and
  `handleFormat`. Swapping it to `parseInput` covers both paths.
- Error messages: surfaced via `setLeftError`/`setRightError` already; the
  YAML parser's `errors[0].message` slots in directly.
- `handleFormat` currently re-serializes with `formatJSON` (JSON output).
  For YAML, an optional `stringify` (from `yaml`) could emit normalized YAML
  instead — **nice-to-have, not required** for the comparison feature. Keep
  v1 scope to comparison; emit diff results as JSON strings for Monaco
  (unchanged display path).
- localStorage keys (`jsonDiff.left`, etc.) store the raw text — unaffected.
- Multi-doc: if wrapped into an array (section 4.3), the diff view shows an
  array of documents. Consider a "doc N of M" hint later; not blocking.

---

## 8. Effort estimate

**S (Small).** Implemented as:

1. Add `yaml` dependency (`pnpm add yaml`).
2. Add `src/utils/parseInput.ts` (adapter, ~40 lines, unit-tested).
3. Replace `JSON.parse` in `validateAndParse` (`App.tsx` ~line 89) with
   `parseInput`; forward `parsed` unchanged to `semanticDiff`.
4. Add a `parseInput.test.ts` covering: valid YAML, JSON-as-YAML, anchors,
   merge keys (`merge: true`), multi-doc, and a parse error.
5. Optional (recommended): enable `merge: true`; wrap multi-doc into arrays.

No changes to `semanticDiff.ts`, `jsonNormalizer.ts`, or the display layer.
The existing test suite (`pnpm test`) continues to pass unchanged, proving
zero regression for JSON.

---

## 9. Risks / caveats

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Merge keys appear as literal `<<` | Verified real | Enable `merge: true` at parse |
| Bare dates stay strings | Verified real | Acceptable; document it |
| Multi-doc pairing ambiguity | Medium | Array-wrap (section 4.3) for v1 |
| YAML-vs-JSON type drift | Low | Existing hashing handles as value change |
| Custom YAML tags (`!foo`) | Low/out-of-scope | Reject with clear error in v1 |

---

## 10. Recommendation

**Proceed.** YAML support is a thin input-boundary adapter over the existing,
format-agnostic diff engine. Effort is Small, regression risk to JSON is
negligible (JSON is valid YAML), and the four YAML-specific concerns
(anchors, merge keys, multi-doc, scalar styles) each have a clear, verified
handling strategy. Reuse of `semanticDiff` / `jsonNormalizer` /
`alignArraysForDiff` is near-total.

See `docs/feasibility-content-comparison.md` for the consolidated
go/no-go across JSONL, YAML, CSV, TSV.
