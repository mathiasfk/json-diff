import { describe, it, expect } from 'vitest';
import {
  detectArrayMatchField,
  calculateSimilarity,
  sortObjectProperties,
  createObjectHashFunction,
  type ArrayMatchStrategy,
} from './jsonNormalizer';

describe('jsonNormalizer', () => {
  describe('detectArrayMatchField', () => {
    it('should return useSimilarity false for non-array inputs', () => {
      const result = detectArrayMatchField({} as any, [] as any);
      expect(result.useSimilarity).toBe(false);
    });

    it('should return useSimilarity false for empty arrays', () => {
      const result = detectArrayMatchField([], []);
      expect(result.useSimilarity).toBe(false);
    });

    it('should return useSimilarity false for arrays without objects', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [4, 5, 6];
      const result = detectArrayMatchField(arr1, arr2);
      expect(result.useSimilarity).toBe(false);
    });

    it('should detect "id" as match field when present and unique', () => {
      const arr1 = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const arr2 = [
        { id: 1, name: 'Alice Updated' },
        { id: 3, name: 'Charlie' },
      ];
      const result = detectArrayMatchField(arr1, arr2);
      expect(result.field).toBe('id');
      expect(result.useSimilarity).toBe(false);
    });

    it('should detect "name" as match field when id is not present', () => {
      const arr1 = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const arr2 = [
        { name: 'Alice', age: 31 },
        { name: 'Charlie', age: 28 },
      ];
      const result = detectArrayMatchField(arr1, arr2);
      expect(result.field).toBe('name');
      expect(result.useSimilarity).toBe(false);
    });

    it('should return useSimilarity true when no suitable match field exists', () => {
      const arr1 = [
        { id: 1, value: 'x' },
        { id: 1, value: 'y' }, // duplicate id and value
      ];
      const arr2 = [
        { id: 2, value: 'a' },
        { id: 2, value: 'a' }, // duplicate id and value
      ];
      const result = detectArrayMatchField(arr1, arr2);
      expect(result.useSimilarity).toBe(true);
    });

    it('should return useSimilarity true when arrays have no common keys', () => {
      const arr1 = [{ foo: 1 }, { foo: 2 }];
      const arr2 = [{ bar: 3 }, { bar: 4 }];
      const result = detectArrayMatchField(arr1, arr2);
      expect(result.useSimilarity).toBe(true);
    });

    it('should prioritize "id" over "name"', () => {
      const arr1 = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const arr2 = [
        { id: 3, name: 'Alice' },
        { id: 4, name: 'Bob' },
      ];
      const result = detectArrayMatchField(arr1, arr2);
      expect(result.field).toBe('id');
    });

    it('should handle arrays with mixed content types', () => {
      const arr1 = [{ id: 1 }, 'string', null];
      const arr2 = [{ id: 2 }, 'other'];
      const result = detectArrayMatchField(arr1, arr2);
      expect(result.useSimilarity).toBe(true);
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1 for identical primitives', () => {
      expect(calculateSimilarity(5, 5)).toBe(1);
      expect(calculateSimilarity('hello', 'hello')).toBe(1);
      expect(calculateSimilarity(true, true)).toBe(1);
    });

    it('should return 0 for different primitives', () => {
      expect(calculateSimilarity(5, 10)).toBe(0);
      expect(calculateSimilarity('hello', 'world')).toBe(0);
      expect(calculateSimilarity(true, false)).toBe(0);
    });

    it('should return 1 for identical null values', () => {
      expect(calculateSimilarity(null, null)).toBe(1);
    });

    it('should return 0 for null vs object', () => {
      expect(calculateSimilarity(null, {})).toBe(0);
      expect(calculateSimilarity({}, null)).toBe(0);
    });

    it('should return 1 for identical empty objects', () => {
      expect(calculateSimilarity({}, {})).toBe(1);
    });

    it('should return 1 for identical objects', () => {
      const obj1 = { name: 'Alice', age: 30 };
      const obj2 = { name: 'Alice', age: 30 };
      expect(calculateSimilarity(obj1, obj2)).toBe(1);
    });

    it('should return 0.5 for objects with same keys but different values', () => {
      const obj1 = { name: 'Alice' };
      const obj2 = { name: 'Bob' };
      expect(calculateSimilarity(obj1, obj2)).toBe(0.5);
    });

    it('should calculate partial similarity for objects with some matching keys', () => {
      const obj1 = { name: 'Alice', age: 30 };
      const obj2 = { name: 'Alice', city: 'NYC' };
      // name matches (1.0), age missing in obj2 (0), city missing in obj1 (0)
      // Total keys: 3 (name, age, city)
      // Matches: 1.0 for name
      // Score: 1 / 3 = 0.333...
      expect(calculateSimilarity(obj1, obj2)).toBeCloseTo(0.333, 2);
    });

    it('should handle deeply nested objects', () => {
      const obj1 = { a: { b: 1 } };
      const obj2 = { a: { b: 1 } };
      expect(calculateSimilarity(obj1, obj2)).toBe(1);
    });

    it('should handle arrays in objects', () => {
      const obj1 = { items: [1, 2, 3] };
      const obj2 = { items: [1, 2, 3] };
      expect(calculateSimilarity(obj1, obj2)).toBe(1);
    });

    it('should return 0 for completely different objects', () => {
      const obj1 = { foo: 1 };
      const obj2 = { bar: 2 };
      expect(calculateSimilarity(obj1, obj2)).toBe(0);
    });
  });

  describe('sortObjectProperties', () => {
    it('should return primitive values unchanged', () => {
      expect(sortObjectProperties(5)).toBe(5);
      expect(sortObjectProperties('hello')).toBe('hello');
      expect(sortObjectProperties(true)).toBe(true);
      expect(sortObjectProperties(null)).toBe(null);
    });

    it('should sort object properties alphabetically', () => {
      const input = { z: 1, a: 2, m: 3 };
      const result = sortObjectProperties(input);
      expect(Object.keys(result)).toEqual(['a', 'm', 'z']);
      expect(result).toEqual({ a: 2, m: 3, z: 1 });
    });

    it('should recursively sort nested objects', () => {
      const input = {
        z: { y: 1, x: 2 },
        a: { c: 3, b: 4 },
      };
      const result = sortObjectProperties(input);
      expect(Object.keys(result)).toEqual(['a', 'z']);
      expect(Object.keys(result.z)).toEqual(['x', 'y']);
      expect(Object.keys(result.a)).toEqual(['b', 'c']);
    });

    it('should handle arrays', () => {
      const input = [3, 1, 2];
      const result = sortObjectProperties(input);
      expect(result).toEqual([3, 1, 2]);
    });

    it('should recursively sort objects inside arrays', () => {
      const input = [
        { z: 1, a: 2 },
        { y: 3, b: 4 },
      ];
      const result = sortObjectProperties(input);
      expect(Object.keys(result[0])).toEqual(['a', 'z']);
      expect(Object.keys(result[1])).toEqual(['b', 'y']);
    });

    it('should handle empty objects', () => {
      expect(sortObjectProperties({})).toEqual({});
    });

    it('should handle empty arrays', () => {
      expect(sortObjectProperties([])).toEqual([]);
    });

    it('should handle complex nested structures', () => {
      const input = {
        users: [
          { name: 'Bob', id: 2 },
          { name: 'Alice', id: 1 },
        ],
        config: {
          timeout: 5000,
          enabled: true,
        },
      };
      const result = sortObjectProperties(input);
      expect(Object.keys(result)).toEqual(['config', 'users']);
      expect(Object.keys(result.config)).toEqual(['enabled', 'timeout']);
      expect(Object.keys(result.users[0])).toEqual(['id', 'name']);
    });
  });

  describe('createObjectHashFunction', () => {
    it('should create hash function using specified field', () => {
      const strategy: ArrayMatchStrategy = { field: 'id', useSimilarity: false };
      const hashFn = createObjectHashFunction(strategy);
      
      const obj = { id: 123, name: 'Alice' };
      expect(hashFn(obj, 0)).toBe('123');
    });

    it('should fallback to JSON serialization when field is missing', () => {
      const strategy: ArrayMatchStrategy = { field: 'id', useSimilarity: false };
      const hashFn = createObjectHashFunction(strategy);
      
      const obj = { name: 'Alice' };
      const result = hashFn(obj, 0);
      expect(result).toBe(JSON.stringify({ name: 'Alice' }));
    });

    it('should use full object serialization when no field is specified', () => {
      const strategy: ArrayMatchStrategy = { useSimilarity: false };
      const hashFn = createObjectHashFunction(strategy);
      
      const obj = { z: 1, a: 2 };
      const result = hashFn(obj, 0);
      // Should be sorted
      expect(result).toBe(JSON.stringify({ a: 2, z: 1 }));
    });

    it('should handle non-object items with field strategy', () => {
      const strategy: ArrayMatchStrategy = { field: 'id', useSimilarity: false };
      const hashFn = createObjectHashFunction(strategy);
      
      expect(hashFn('string', 0)).toBe(JSON.stringify('string'));
      expect(hashFn(123, 0)).toBe(JSON.stringify(123));
      expect(hashFn(null, 0)).toBe(JSON.stringify(null));
    });

    it('should create consistent hashes for identical objects', () => {
      const strategy: ArrayMatchStrategy = { useSimilarity: false };
      const hashFn = createObjectHashFunction(strategy);
      
      const obj1 = { name: 'Alice', age: 30 };
      const obj2 = { age: 30, name: 'Alice' };
      
      expect(hashFn(obj1, 0)).toBe(hashFn(obj2, 0));
    });

    it('should handle nested objects in hash', () => {
      const strategy: ArrayMatchStrategy = { useSimilarity: false };
      const hashFn = createObjectHashFunction(strategy);
      
      const obj = { user: { name: 'Alice', id: 1 } };
      const result = hashFn(obj, 0);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});

