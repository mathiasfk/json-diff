# Feasibility: Adding Non-JSON Content Formats (JSONL, YAML)

**Status:** Historical decision record. JSONL and YAML were implemented and shipped; the product supports JSON, JSONL and YAML.
**Date:** 2026-08-17
**Scope:** Single source of truth summarizing the per-format feasibility studies and the underlying algorithm analysis.
**Author:** dev (kanban t_f14aaccf)

This document rolls up:

- `ANALYSIS-similarity-algorithm.md` (task t_9ced8bcb) — algorithm & extension points
- `docs/feasibility-jsonl.md` (task t_733b7e15) — JSONL study
- `docs/feasibility-yaml.md` (task t_8d1b709b) — YAML study

---

## 1. Current Algorithm Overview & Extension Points

### 1.1 What the engine actually is

The comparison engine in `src/utils/` is **a format-agnostic object comparator**, not a JSON tool. The public surface the app depends on:

- `semanticDiff(left: any, right: any): { delta, left, right }` (`src/utils/semanticDiff.ts:330`) — the only real entry point. `delta` is the jsondiffpatch patch (or `undefined` when equal); `left`/`right` are the normalized copies used for display.
- `formatJSON(obj: any, normalize?: boolean): string` (`semanticDiff.ts:352`) — pretty-print; runs `normalizeForDisplay` when `normalize=true`.

The diff itself is delegated to **jsondiffpatch** (Myers diff under the hood). Our value-add is *preprocessing* (alignment + hashing):

```
semanticDiff(left, right)
 └─ normalizeForDiff(left, right)            [recursive, pair-aware]
 │    ├─ alignArraysForDiff(lArr, rArr)
 │    │    ├─ findUniqueKeyCommonToBoth      → picks an id-like match field
 │    │    ├─ matchArraysMaxSimilarity(...)  → content/similarity pairing
 │    │    └─ annotate each item with __match_* (non-enumerable)
 │    └─ per-object-key recursion
 └─ sortObjectProperties(normLeft / normRight)
 └─ createSemanticDiffer() → jsondiffpatch.diff(processedLeft, processedRight)
```

The array-matching layer lives in `src/utils/arraySimilarityMatcher.ts` (`matchArraysMaxSimilarity`, `fieldSimilarity`, `objectSimilarity`, `DEFAULT_WEIGHTS`) and is independently configurable.

### 1.2 The only format boundary

Everything downstream of `semanticDiff` operates on **already-parsed `any` objects**. The single JSON-specific step is the parse call in `validateAndParse` (`src/App.tsx:83-91`), which does `JSON.parse` and returns `{ valid, parsed }`. `handleCompare` (App.tsx:99) calls it on both sides, then `semanticDiff(leftResult.parsed, rightResult.parsed)`.

> **The one extension point for any new content type is the parser at `validateAndParse`.** Convert the new format's text into the same `any` object/array shape, and 100% of the existing normalization, similarity-matching, and diff pipeline is reused unchanged.

### 1.3 The linchpin annotation contract

Smart array matching works because each array item is annotated with **non-enumerable** props (so they survive `JSON.parse(JSON.stringify(...))` deep-clones and property sorting):

- `__match_strategy`: `'id' | 'content' | 'similarity'`
- `__match_field`: `string` — the chosen key (`"id"`, `"name"`, …)
- `__match_key`: `string` — synthetic pairing key for similarity matches (`sim:0`, `sim:1`, …)

These bridge `alignArraysForDiff` and the custom `objectHash` in `createSemanticDiffer`. **Any new parser/normalizer must preserve this contract** (i.e. not strip non-enumerable props before handing data to `semanticDiff`).

### 1.4 Dead code to ignore

`src/utils/jsonNormalizer.ts` exports `detectArrayMatchField`, `calculateSimilarity`, `createObjectHashFunction`, `ArrayMatchStrategy` — these are **legacy and unused** by `semanticDiff.ts` (which defines its own `alignArraysForDiff`/`MatchStrategy` and calls `matchArraysMaxSimilarity` directly). Build new format work on `semanticDiff.ts` + `arraySimilarityMatcher.ts`, not on `jsonNormalizer.ts`.

---

## 2. Per-Format Feasibility Assessment

Legend: **GO** = proceed; **GO (parser work)** = feasible, main effort is parsing; **Effort**: S = Small, M = Medium, L = Large.

| Format | Verdict | Effort | Core change | Algorithm change |
|--------|---------|--------|-------------|------------------|
| **JSONL** | GO | S | `parseJsonl` helper + UI toggle | None |
| **YAML**  | GO | S | `parseInput` adapter (yaml lib) | None |

Both are feasible with **zero changes to the diffing algorithm** — only the input parser and a thin UI mode differ.

---

### 2.1 JSONL (JSON Lines)

**Verdict: GO — effort S.**

JSONL is just "an array of JSON values, one per line." Because `semanticDiff` already treats a top-level array of JSON values as its primary case, most of the work is parsing + a thin UI mode.

- **Parsing:** split on `\r?\n`, trim, `JSON.parse` each non-empty line. No new dependency (reuses `JSON.parse` from `App.tsx`). Strict mode surfaces the 1-based failing line number; lenient mode tolerates blank/trailing lines (recommended default).
- **Comparison (recommended):** feed the parsed lines as a single top-level **array** `[line1, line2, …]` straight into `semanticDiff`. Array-of-objects alignment (`alignArraysForDiff`) already handles id-based / content-based matching, move detection, and nested normalization. Line-by-line pairing is a possible future toggle but not needed for v1.
- **Reuse:** `semanticDiff`, `normalizeForDiff`/`normalizeForDisplay`, `jsonNormalizer`-equivalent helpers, `DiffViewer`/Monaco — all reused unchanged.
- **Streaming/chunking:** not required for v1; defer past a real threshold (~50k lines warning guard recommended).
- **New code:** ~40-line `src/utils/jsonl.ts` (`parseJsonl`) + a JSONL mode toggle in `App.tsx`.
- **Validation:** 6 prototype cases run against the real engine passed; existing 107-test suite green.

### 2.2 YAML

**Verdict: GO — effort S.**

YAML is a superset of JSON and the engine operates on parsed JS values, so only the `JSON.parse` boundary changes.

- **Parsing:** use a real parser (`yaml@2.9.0` recommended; `js-yaml@5.3.0` alternative — both verified installable). Suggested `parseInput(text)` probes with `parseAllDocuments`: reject the whole input if any document fails; return a single value when one doc, an array when multiple.
- **Features (all verified):** anchors/aliases expand inline (desired semantic behavior); merge keys (`<<`) require `merge: true` to fold cleanly — **recommend enabling**; multi-doc (`---`) → wrap each side as an array of documents and reuse existing array alignment; comments/quoting/key-order are textual and discarded by the parser (fully compatible with the already-semantic tool); bare dates stay strings (acceptable).
- **No regression to JSON:** JSON is valid YAML, so a single `parseInput` entry point replaces `validateAndParse` with zero behavioral change for existing users.
- **Reuse:** `semanticDiff` / `jsonNormalizer`-equivalent / `alignArraysForDiff` reused near-totally.
- **New code:** `pnpm add yaml` + `src/utils/parseInput.ts` (~40 lines, unit-tested) + swap in `App.tsx`.
- **Validation:** real `yaml@2.9.0` probe; PR CI (lint/test/build + preview) green.

---

## 3. Recommended Implementation Approach (per format)

### JSONL
1. Add `src/utils/jsonl.ts` with `parseJsonl` (strict + lenient, line-numbered errors).
2. Add a JSONL mode selector in `App.tsx`; in JSONL mode parse both sides and pass the resulting **arrays** to `semanticDiff` (whole-document Option A).
3. Surface parse errors with the offending 1-based line number.
4. Reuse `formatJSON` / `DiffViewer` unchanged.
5. Defer line-by-line (Option B) and streaming/chunking.
- **Open (non-blocking):** paired line-by-line toggle (recommend no for v1); trailing/blank line tolerance (yes); size guard threshold (~50k lines).

### YAML
1. `pnpm add yaml` (2.9.0).
2. Add `src/utils/parseInput.ts` (adapter, ~40 lines, unit-tested): `parseAllDocuments`, reject on any doc error, multi-doc → array.
3. Replace `JSON.parse` in `validateAndParse` (`App.tsx` ~line 89) with `parseInput`; forward `parsed` unchanged to `semanticDiff`.
4. Enable `merge: true`; wrap multi-doc into arrays at parse time.
5. Add `parseInput.test.ts`: valid YAML, JSON-as-YAML, anchors, merge keys, multi-doc, parse error.
- **Open (non-blocking):** emit normalized YAML via `stringify` for the Format button (nice-to-have); "doc N of M" hint (defer).

---

## 4. Code Reuse Opportunities

| Existing piece | JSONL | YAML |
|---|---|---|
| `semanticDiff` (`semanticDiff.ts:330`) | as-is | as-is |
| `normalizeForDiff` / `normalizeForDisplay` | as-is | as-is |
| `alignArraysForDiff` + `findUniqueKeyCommonToBoth` | as-is | as-is |
| `matchArraysMaxSimilarity` (`arraySimilarityMatcher.ts`) | as-is | as-is |
| `DiffViewer` / Monaco | as-is | as-is |
| `formatJSON` | as-is | as-is (JSON output) |
| `JSON.parse` (`App.tsx:89`) | per line | ➝ replaced by `parseInput` |
| `gtag` analytics | + format dim (optional) | + format dim (optional) |

**New code required (small, isolated):**
- `src/utils/jsonl.ts` — `parseJsonl` + JSONL toggle.
- `src/utils/parseInput.ts` (yaml dep) — `parseInput` adapter.
- Thin UI changes in `App.tsx` / `JsonEditor.tsx` — additive, JSON path untouched.

The dominating reuse theme: **the engine is already a generic object comparator; each format adds only a text→object parser plus a UI mode switch.** No format needs to touch `semanticDiff.ts`, `arraySimilarityMatcher.ts`, or the display layer.

---

## 5. Effort Estimates

| Format | Effort | Rough shape |
|--------|--------|-------------|
| JSONL | **S** | ~40-line `jsonl.ts` + UI toggle; no deps; no algorithm change. |
| YAML | **S** | `yaml` dep + ~40-line `parseInput.ts` + swap in `App.tsx`; no algorithm change. |

**Cross-cutting (small, once):** a format-selector UI component and a `validateAndParse` dispatch refactor.

---

## 6. Recommended Priority Order

1. **YAML (S) — do first.** Lowest risk, highest reuse, and JSON is valid YAML so the swap is regression-free for existing users. Single small adapter, no new comparison logic.
2. **JSONL (S) — do second.** Equally small; reuses `JSON.parse` with a line loop; whole-document array diff needs zero new comparison code.

**Rationale:** both are GO, both reuse the same engine unchanged. The order maximizes early wins (YAML/JSONL are near-free and de-risk the parser-dispatch refactor).

---

## 7. Acceptance Criteria (this document)

- Document exists in `docs/` (`docs/feasibility-content-comparison.md`).
- Covers both shipped formats (JSONL, YAML).
- Provides a clear go/no-go per format:
  - JSONL → **GO**
  - YAML → **GO**
- Includes algorithm overview + extension points (§1), per-format pros/cons (§2), recommended approach (§3), reuse map (§4), effort estimates (§5), and priority order (§6).

## 8. Source Studies

- `docs/feasibility-jsonl.md` (t_733b7e15, PR #17)
- `docs/feasibility-yaml.md` (t_8d1b709b, PR #20)
- `ANALYSIS-similarity-algorithm.md` (t_9ced8bcb, PR #18)
