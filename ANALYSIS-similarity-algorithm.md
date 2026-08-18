# Analysis: Similarity / Comparison Algorithm & Extension Points

Scope of this document: examine the current comparison engine in `src/utils/` and
identify (1) the core interface & data structures, (2) how content is parsed /
normalized before comparison, (3) extension points for new content types, and
(4) format-specific logic that would need generalization.

This is a temporary analysis artifact for task `t_9ced8bcb`, feeding the
consolidation task `t_f14aaccf` (and the per-format feasibility tasks).

---

## 1. Core algorithm interface & data structures

### Public API (the only surface the rest of the app depends on)

`src/utils/semanticDiff.ts`:

- `semanticDiff(left: any, right: any): { delta: any; left: any; right: any }`
  Main entry point. `delta` is the jsondiffpatch patch (or `undefined` when
  identical). `left`/`right` are the normalized copies used for display.
- `formatJSON(obj: any, normalize?: boolean): string`
  Pretty-prints; when `normalize=true` it runs `normalizeForDisplay` first.

`src/utils/arraySimilarityMatcher.ts` (pure, independently usable):

- `matchArraysMaxSimilarity(left, right, options?): SimilarityResult`
  `options = { weights?: FieldWeights; threshold?: number }`
  `SimilarityResult = { pairs, unmatchedLeft, unmatchedRight, matrix, totalSimilarity }`
- Exported scoring primitives: `fieldSimilarity`, `objectSimilarity`,
  `DEFAULT_WEIGHTS`, types `FieldWeights`, `SimilarityResult`, `MatchOptions`.

### Underlying library
The diff itself is delegated to **jsondiffpatch** (`jsondiffpatch.create({...}).diff`).
Myers diff under the hood; our value-add is preprocessing (alignment + hashing).

### Key data structures
- **Normalized objects**: plain JSON values with properties recursively sorted
  (alphabetical) and arrays aligned/reordered. No new container type — just `any`.
- **Matching annotations** (carried as *non-enumerable* props to survive
  `JSON.parse(JSON.stringify(...))` deep-clones and property sorting):
  - `__match_strategy`: `'id' | 'content' | 'similarity'`
  - `__match_field`: `string` (the chosen key, e.g. `"id"` / `"name"`)
  - `__match_key`: `string` (synthetic pairing key, used by similarity matches)
  These are the bridge between `alignArraysForDiff` and the `objectHash` in
  `createSemanticDiffer`. **This is the most important internal contract.**
- **`MatchStrategy`** (local union) and **`SimilarityResult`** (exported) are the
  only named structural types; everything else is `any`.

### Call graph (hot path)
```
semanticDiff(left, right)
 └─ normalizeForDiff(left, right)            [recursive]
     ├─ alignArraysForDiff(lArr, rArr)       [arrays]
     │    ├─ deepClone / sortObjectProperties / serializeSorted / omitField
     │    ├─ findUniqueKeyCommonToBoth
     │    ├─ multisetEqualBySerializationIgnoringField
     │    └─ matchArraysMaxSimilarity(...)    [only on 'similarity' path]
     └─ (per-object-key recursion)
 └─ sortObjectProperties(normLeft / normRight)
 └─ createSemanticDiffer()  -> jsondiffpatch.diff(processedLeft, processedRight)
```

---

## 2. How content is parsed / normalized before comparison

### Parsing boundary (THE format boundary)
- Location: `src/App.tsx` → `validateAndParse(json: string)` at line ~83.
  It does `JSON.parse(json)` and returns `{ valid, parsed }`.
- `handleCompare` (App.tsx:99) calls `validateAndParse` on both sides, then
  `semanticDiff(leftResult.parsed, rightResult.parsed)`.
- **Everything downstream of `semanticDiff` operates on already-parsed `any`
  objects.** There is no awareness of the source text format inside the
  algorithm. This is the single most valuable fact for adding new formats:
  a new format (JSONL/YAML/CSV/TSV) only needs a parser that converts its text
  into the same `any` object/tree shape, and 100% of the existing algorithm is
  reused unchanged.

### Normalization steps (inside `semanticDiff`)
1. `normalizeForDiff(left, right)` — pair-aware preprocessing:
   - **Arrays** → `alignArraysForDiff`:
     - Primitive arrays: sorted by value (number by magnitude, else locale string).
     - Object arrays:
       - Find a *unique common key* (present in all items of both arrays, with
         distinct values) via `findUniqueKeyCommonToBoth` → `field`.
       - If `field` exists and both sides share the same key-value space →
         strategy **`id`** (detect moves/renames).
       - If `field` exists but key spaces differ (e.g. `id 1,2,3` vs `10,20,30`)
         and the multisets differ on that field → strategy **`similarity`**:
         `matchArraysMaxSimilarity` builds the pairing; matched items get a shared
         synthetic `__match_key` (`sim:0`, `sim:1`, …) so `objectHash` treats them
         as modifications, not remove+add.
       - Else → strategy **`content`** (serialize-ignoring-that-field, else full
         sorted serialization) for stable deterministic sorting.
     - All strategies annotate each item with `__match_strategy` / `__match_field`
       (non-enumerable) so the later `objectHash` honors the pairing.
   - **Objects** → recurse key-by-key, preserving matching annotations.
   - **Scalars** → deep-cloned as-is.
2. `sortObjectProperties` — final recursive alphabetical property sort on both
   sides (also preserves the non-enumerable annotations).
3. `createSemanticDiffer` builds the jsondiffpatch differ with a custom
   `objectHash` that reads `__match_strategy` / `__match_field` / `__match_key`
   and falls back to `content:<serialized>` hashing. `arrays.detectMove: true`.

### Display-side normalization
`normalizeForDisplay(value)` — single-side mirror of the rules (no peer needed):
sorts properties, sorts primitives/objects by the same derived key. Used by
`formatJSON(obj, normalize=true)` for pretty display.

---

## 3. Extension points for new content types

| Layer | What to change | Effort | Notes |
|-------|---------------|--------|-------|
| **Format → object** | Add a parser producing `any`; call it in `validateAndParse` (or replace `JSON.parse`). | Low for JSONL/YAML, Med for CSV/TSV | This is the *only* mandatory change to reuse the whole engine. No algorithm edits needed. |
| **Object → object (pre-processing)** | `normalizeForDiff` / `alignArraysForDiff` | Already generic | Already content-type agnostic (operates on `any`). No change expected. |
| **Array similarity** | `matchArraysMaxSimilarity` options (`weights`, `threshold`) | Low | Already configurable per-call; no structural change needed. |
| **Diff core** | `createSemanticDiffer` jsondiffpatch options | Low | Already a single factory; easy to parametrize. |
| **Output** | `formatJSON` / add exporters | Low | Pure display; per-format formatting is optional. |
| **UI** | `App.tsx` input handling, a format selector, `DiffViewer` | Med | Wiring, not algorithm. |

**Conclusion:** the engine is already a *format-agnostic object comparator*. The
extension point is the parser at `validateAndParse`; the downstream pipeline
(normalization, similarity matching, jsondiffpatch) is reusable as-is for any
format that can be represented as JSON-like objects/arrays.

---

## 4. Format-specific logic that would need generalization

These are the only places where *JSON assumptions* or *JSON-shaped* data leak,
and where generalization would be required:

1. **`validateAndParse` hard-codes `JSON.parse`** (App.tsx:83-91).
   → Must be made format-aware (dispatch per selected format). This is the
   primary generalization point.

2. **Scalar typing assumptions in `arraySimilarityMatcher.ts`:**
   - `fieldSimilarity` branches on `typeof` (`number | boolean | string |
     object`). Fine for JSON/YAML. For CSV/TSV every value is a *string*, so the
     matcher would treat all values as strings (Levenshtein ratio) unless a
     type-inference/coercion step is added during parsing. JSONL/YAML preserve
     real types and need nothing.
   - `structuralSimilarity` uses `JSON.stringify` for nested values — assumes
     JSON-serializable values (no `Date`, `RegExp`, functions). Acceptable for
     all four target formats if the parser emits plain data.

3. **Non-enumerable annotation transport relies on `JSON.parse(JSON.stringify)`
   deep-clones** (`deepClone`, `sortObjectProperties`). Any value that does not
   survive a JSON round-trip (e.g. undefined-in-arrays, cycles, `Date`) is lost.
   YAML anchors/aliases and CSV typed columns are the risk areas — resolvable in
   the parser (resolve aliases, coerce columns) before reaching the engine.

4. **`findUniqueKeyCommonToBoth` / array alignment assume object arrays with
   comparable string-coercible keys.** Works for JSON/YAML object arrays and for
   CSV/TSV *once rows are modeled as objects* (header → keys). No change needed
   if the parser emits row-objects.

5. **No streaming / chunking anywhere.** The whole document is parsed and held in
   memory and passed to `jsondiffpatch.diff` (Myers, in-memory). Large JSONL /
   CSV files would need either (a) whole-doc-in-memory (simplest, reuse as-is)
   or (b) a chunked/line-based comparison mode (new code). For feasibility, the
   whole-doc approach is the natural first step and reuses everything.

6. **`formatJSON` output is JSON-shaped pretty print.** Per-format textual
   rendering (e.g. re-emitting CSV diff as CSV) would be a new, optional layer.

### Dead / orphaned code (does NOT need generalization, but worth noting)
`src/utils/jsonNormalizer.ts` exports `detectArrayMatchField`,
`calculateSimilarity`, `createObjectHashFunction`, and the `ArrayMatchStrategy`
interface — these are **legacy** and are NOT used by `semanticDiff.ts` (which
defines its own `alignArraysForDiff` / `MatchStrategy` and calls
`matchArraysMaxSimilarity` directly). They are only referenced by
`jsonNormalizer.test.ts`. The matcher's header even references a
`docs/array-similarity-matching.md` that does not exist. New format work should
build on `arraySimilarityMatcher.ts` + `semanticDiff.ts`, not on
`jsonNormalizer.ts`'s duplicate helpers.

---

## Summary for downstream tasks
- The algorithm is a **format-agnostic object comparator**; the only real
  extension point for new content types is the **parser at `validateAndParse`**.
- JSONL and YAML map almost perfectly (they already produce JSON-shaped data);
  CSV/TSV need a row→object modeling decision but can reuse the exact same
  pipeline once parsed.
- The internal `__match_strategy/__match_field/__match_key` annotation contract
  is the linchpin and should be preserved by any parser/normalizer changes.
- Avoid the legacy `jsonNormalizer.ts` helpers; the live code path is
  `semanticDiff.ts` + `arraySimilarityMatcher.ts`.
