import { describe, expect, it } from 'vitest';
import * as jsondiffpatch from 'jsondiffpatch';
import { semanticDiff } from './semanticDiff';

describe('array comparison by position', () => {
  const cases: [unknown, unknown][] = [
    [[1, 2], [2, 1]],
    [[{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 1 }]],
    [{ nested: [[1, 2]] }, { nested: [[2, 1]] }],
    [[1, { x: [1, 2] }, 'a'], [1, { x: [2, 1] }, 'a']],
    [[1, 1, 2], [1, 2, 1]],
    [[1, 2], [0, 1, 2]],
    [[1, 2, 3], [1]],
    [{ x: [1] }, { x: { 0: 1 } }],
  ];
  it.each(cases)('compares recursively and produces reversible deltas: %j / %j', (left, right) => {
    const beforeLeft = structuredClone(left);
    const beforeRight = structuredClone(right);
    const result = semanticDiff(left, right, { arrayComparison: 'position' });
    expect(result.delta).toBeDefined();
    expect(jsondiffpatch.patch(structuredClone(result.left), result.delta)).toEqual(result.right);
    expect(jsondiffpatch.unpatch(structuredClone(result.right), result.delta)).toEqual(result.left);
    expect(left).toEqual(beforeLeft);
    expect(right).toEqual(beforeRight);
  });
  it('pairs indices instead of finding a longest common subsequence or moving objects', () => {
    expect(semanticDiff([1, 2], [0, 1, 2], { arrayComparison: 'position' }).delta)
      .toEqual({ _t: 'a', 0: [1, 0], 1: [2, 1], 2: [2] });
    expect(semanticDiff([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 1 }], { arrayComparison: 'position' }).delta)
      .toEqual({ _t: 'a', 0: { id: [1, 2] }, 1: { id: [2, 1] } });
  });
  it('preserves the default alignment and object property normalization', () => {
    const left = { a: [1, 2], b: { z: 1, a: 2 } };
    const right = { b: { a: 2, z: 1 }, a: [2, 1] };
    expect(semanticDiff(left, right).delta).toBeUndefined();
    expect(semanticDiff(left, right, { arrayComparison: 'position' }).delta).toBeDefined();
    expect(semanticDiff({ z: 1, a: [2, 1] }, { a: [2, 1], z: 1 }, { arrayComparison: 'position' }).delta).toBeUndefined();
  });
});
