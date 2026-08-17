import { describe, it, expect } from 'vitest';
import { semanticDiff } from './semanticDiff';

describe('semanticDiff — apple/citrus/banana integration', () => {
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

  it('matches all 3 items as modifications (not added/removed)', () => {
    const result = semanticDiff(left, right);

    expect(result.delta).toBeDefined();
    expect(result.delta._t).toBe('a');

    const changeKeys = Object.keys(result.delta).filter((k) => k !== '_t');
    expect(changeKeys).toHaveLength(3);

    // The similarity matcher reorders items by their content key (id is ignored
    // because the id spaces differ), so look each item up by its original `id`
    // rather than assuming the delta array keeps the left input order.
    const byLeftId = (id: number): any => {
      for (const k of changeKeys) {
        const entry = result.delta[k];
        if (entry && Array.isArray(entry.id) && entry.id[0] === id) return entry;
      }
      throw new Error(`no delta entry for id ${id}`);
    };

    // Verify apple: id 1→10, description unchanged
    const appleDelta = byLeftId(1);
    expect(appleDelta.id).toEqual([1, 10]);
    expect(appleDelta.description).toBeUndefined();

    // Verify citrus: id 3→30, description unchanged
    const citrusDelta = byLeftId(3);
    expect(citrusDelta.id).toEqual([3, 30]);
    expect(citrusDelta.description).toBeUndefined();

    // Verify banana: id 2→20, description changed
    const bananaDelta = byLeftId(2);
    expect(bananaDelta.id).toEqual([2, 20]);
    expect(bananaDelta.description).toBeDefined();
  });

  it('does not report any item as added or removed', () => {
    const result = semanticDiff(left, right);
    const changeKeys = Object.keys(result.delta).filter((k) => k !== '_t');
    for (const k of changeKeys) {
      const change = result.delta[k];
      expect(change._t).toBeUndefined();
    }
  });
});
