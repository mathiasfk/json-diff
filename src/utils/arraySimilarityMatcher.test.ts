import { describe, it, expect } from 'vitest';
import {
  fieldSimilarity,
  objectSimilarity,
  matchArraysMaxSimilarity,
} from './arraySimilarityMatcher';

// The apple/citrus/banana example from docs/array-similarity-matching.md.
// LEFT and RIGHT use DIFFERENT id spaces, which breaks the key-hash matcher.
const left = [
  { description: 'red and sweat', id: 1, name: 'apple' },
  { description: 'sour', id: 3, name: 'citrus' },
  { description: 'yellow', id: 2, name: 'banana' },
];
const right = [
  { description: 'red and sweat', id: 10, name: 'apple' },
  { id: 20, name: 'banana', description: 'easy to peal' },
  { id: 30, name: 'citrus', description: 'sour' },
];

describe('fieldSimilarity', () => {
  it('returns 1 for equal numbers', () => {
    expect(fieldSimilarity(5, 5)).toBe(1);
  });

  it('returns a relative-distance ratio for different numbers', () => {
    // |10-20| / max(10,20) = 0.5  =>  1 - 0.5 = 0.5
    expect(fieldSimilarity(10, 20)).toBeCloseTo(0.5, 5);
  });

  it('returns 0 for numbers with no overlap magnitude', () => {
    // both 0 -> mag 0 -> ratio 0 -> 1; ensure no divide-by-zero crash
    expect(fieldSimilarity(0, 0)).toBe(1);
  });

  it('returns 1 for equal booleans and 0 otherwise', () => {
    expect(fieldSimilarity(true, true)).toBe(1);
    expect(fieldSimilarity(true, false)).toBe(0);
  });

  it('returns 1 for equal (case/space-insensitive) strings', () => {
    expect(fieldSimilarity('  Apple ', 'apple')).toBe(1);
  });

  it('returns a high ratio for minor typos', () => {
    const r = fieldSimilarity('bananna', 'banana');
    expect(r).toBeGreaterThan(0.7);
    expect(r).toBeLessThan(1);
  });

  it('returns 0 for type mismatch', () => {
    expect(fieldSimilarity('5', 5)).toBe(0);
  });

  it('returns 0 when either side is missing', () => {
    expect(fieldSimilarity('a', undefined)).toBe(0);
    expect(fieldSimilarity(null, 'b')).toBe(0);
  });

  it('returns Jaccard coverage for nested objects', () => {
    expect(fieldSimilarity({ a: 1, b: 2 }, { a: 1, c: 3 })).toBeCloseTo(1 / 3, 5);
  });
});

describe('objectSimilarity', () => {
  it('returns 0 when there are no shared fields', () => {
    expect(objectSimilarity({ a: 1 }, { b: 2 })).toBe(0);
  });

  it('scores 1 for identical objects', () => {
    expect(objectSimilarity({ id: 1, name: 'x' }, { id: 1, name: 'x' })).toBe(1);
  });

  it('lowers coverage (not shared-score) when one side has an extra field', () => {
    const full = { id: 1, name: 'apple', description: 'red' };
    const fewer = { id: 1, name: 'apple' };
    // shared score = 1 (same values), coverage = 2/3
    expect(objectSimilarity(full, fewer)).toBeCloseTo(0.7 * 1 + 0.3 * (2 / 3), 5);
  });

  it('treats a missing field as simply absent (no penalty to shared-score)', () => {
    const a = { name: 'apple', description: 'red' };
    const b = { name: 'apple' }; // description missing
    // shared = {name} -> weighted 1, coverage = 1/2
    expect(objectSimilarity(a, b)).toBeCloseTo(0.7 + 0.3 * 0.5, 5);
  });

  it('weights name higher than a differing description', () => {
    const a = { name: 'apple', description: 'red' };
    const b = { name: 'apple', description: 'completely different text here' };
    const sim = objectSimilarity(a, b);
    // weighted shared < 1 because description differs; coverage = 1
    expect(sim).toBeGreaterThan(0.7);
    expect(sim).toBeLessThan(1);
  });
});

describe('matchArraysMaxSimilarity — worked example', () => {
  const res = matchArraysMaxSimilarity(left, right);

  it('produces the verified similarity matrix', () => {
    expect(res.matrix[0][0]).toBeCloseTo(0.82, 2);
    expect(res.matrix[0][1]).toBeCloseTo(0.4062, 2);
    expect(res.matrix[0][2]).toBeCloseTo(0.3221, 2);
    expect(res.matrix[1][0]).toBeCloseTo(0.3754, 2);
    expect(res.matrix[1][2]).toBeCloseTo(0.82, 2);
    expect(res.matrix[2][1]).toBeCloseTo(0.6367, 2);
  });

  it('pairs every item with its true counterpart (apple/citrus/banana)', () => {
    // Normalize to a {leftName -> rightName} map, ignoring order.
    const byRightName = (idx: number) => right[idx].name;
    const pairs = res.pairs.map((p) => [left[p.leftIndex].name, byRightName(p.rightIndex)]);
    expect(pairs).toContainEqual(['apple', 'apple']);
    expect(pairs).toContainEqual(['citrus', 'citrus']);
    expect(pairs).toContainEqual(['banana', 'banana']);
  });

  it('maximizes total similarity to the verified 2.2767', () => {
    expect(res.totalSimilarity).toBeCloseTo(2.2767, 3);
  });

  it('leaves no item unmatched (all are modifications)', () => {
    expect(res.unmatchedLeft).toEqual([]);
    expect(res.unmatchedRight).toEqual([]);
    expect(res.pairs).toHaveLength(3);
  });

  it('is deterministic across runs', () => {
    const a = matchArraysMaxSimilarity(left, right);
    const b = matchArraysMaxSimilarity(left, right);
    expect(a.pairs).toEqual(b.pairs);
    expect(a.matrix).toEqual(b.matrix);
  });
});

describe('matchArraysMaxSimilarity — edge cases', () => {
  it('matches identical objects with score 1', () => {
    const a = [{ id: 1, name: 'a', value: 10 }];
    const b = [{ id: 1, name: 'a', value: 10 }];
    const res = matchArraysMaxSimilarity(a, b);
    expect(res.pairs).toHaveLength(1);
    expect(res.pairs[0].score).toBeCloseTo(1, 5);
    expect(res.unmatchedLeft).toEqual([]);
    expect(res.unmatchedRight).toEqual([]);
  });

  it('reports completely unrelated objects (no shared fields) as removed + added', () => {
    const a = [{ id: 1, name: 'alpha', kind: 'x' }];
    const b = [{ uuid: 9, label: 'beta', category: 'y' }];
    // No shared field means objectSimilarity = 0 -> below threshold -> unmatched.
    const r2 = matchArraysMaxSimilarity(a, b);
    expect(r2.pairs).toHaveLength(0);
    expect(r2.unmatchedLeft).toEqual([0]);
    expect(r2.unmatchedRight).toEqual([0]);
  });

  it('pairs different-but-fields-overlap objects under default threshold (low score)', () => {
    // Same field names but totally different values: similarity is low (>=0) so
    // with default threshold 0 it is still treated as a (weak) modification.
    const a = [{ id: 1, name: 'alpha', kind: 'x' }];
    const b = [{ id: 9, name: 'beta', kind: 'y' }];
    const res = matchArraysMaxSimilarity(a, b);
    expect(res.pairs).toHaveLength(1);
    expect(res.pairs[0].score).toBeGreaterThan(0);
    expect(res.pairs[0].score).toBeLessThan(0.5);
  });

  it('handles missing fields on one side without false negatives', () => {
    // Right side item is missing the `description` field entirely.
    const a = [{ id: 1, name: 'apple', description: 'red' }];
    const b = [{ id: 1, name: 'apple' }];
    const res = matchArraysMaxSimilarity(a, b);
    expect(res.pairs).toHaveLength(1);
    expect(res.pairs[0].leftIndex).toBe(0);
    expect(res.pairs[0].rightIndex).toBe(0);
    expect(res.pairs[0].score).toBeGreaterThan(0.8);
  });

  it('handles extra fields on one side (lowers coverage, still matches)', () => {
    const a = [{ id: 1, name: 'apple', description: 'red' }];
    const b = [{ id: 1, name: 'apple', description: 'red', meta: { tag: 'fruit' } }];
    const res = matchArraysMaxSimilarity(a, b);
    expect(res.pairs).toHaveLength(1);
    // scores below 1 because coverage < 1 (extra `meta` field on right)
    expect(res.pairs[0].score).toBeGreaterThan(0.9);
    expect(res.pairs[0].score).toBeLessThan(1);
  });

  it('reports added/removed when array lengths differ', () => {
    const a = [{ id: 1, name: 'apple' }];
    const b = [
      { id: 1, name: 'apple' },
      { id: 2, name: 'banana' },
    ];
    const res = matchArraysMaxSimilarity(a, b);
    expect(res.pairs).toHaveLength(1);
    expect(res.pairs[0].leftIndex).toBe(0);
    expect(res.pairs[0].rightIndex).toBe(0);
    expect(res.unmatchedRight).toEqual([1]);
  });

  it('breaks ties deterministically by lowest index', () => {
    // Two identical right items; both left items are identical too.
    // Expect left[0]->right[0], left[1]->right[1] (stable lowest-index tie break).
    const a = [
      { id: 1, name: 'dup' },
      { id: 1, name: 'dup' },
    ];
    const b = [
      { id: 1, name: 'dup' },
      { id: 1, name: 'dup' },
    ];
    const res = matchArraysMaxSimilarity(a, b);
    expect(res.pairs).toHaveLength(2);
    expect(res.pairs).toContainEqual({ leftIndex: 0, rightIndex: 0, score: 1 });
    expect(res.pairs).toContainEqual({ leftIndex: 1, rightIndex: 1, score: 1 });
  });

  it('respects a raised threshold: weak pairs become unmatched', () => {
    // banana<->banana scores ~0.6367; raising threshold to 0.7 forces it out.
    const res = matchArraysMaxSimilarity(left, right, { threshold: 0.7 });
    const names = res.pairs.map((p) => right[p.rightIndex].name);
    expect(names).not.toContain('banana');
    expect(res.unmatchedLeft.length).toBeGreaterThan(0);
  });

  it('returns empty result for empty inputs', () => {
    const res = matchArraysMaxSimilarity([], []);
    expect(res.pairs).toEqual([]);
    expect(res.matrix).toEqual([]);
    expect(res.totalSimilarity).toBe(0);
  });

  it('does not mutate the input arrays', () => {
    const snapshot = JSON.stringify(left);
    matchArraysMaxSimilarity(left, right);
    expect(JSON.stringify(left)).toBe(snapshot);
  });

  it('accepts custom weights', () => {
    const a = [{ id: 1, name: 'apple', description: 'red fruit' }];
    const b = [{ id: 1, name: 'apple', description: 'green fruit' }];
    const res = matchArraysMaxSimilarity(a, b, {
      weights: { name: 10, id: 1, description: 1, default: 1 },
    });
    expect(res.pairs).toHaveLength(1);
    expect(res.pairs[0].score).toBeGreaterThan(0.9); // name dominates
  });
});
