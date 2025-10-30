import { describe, it, expect } from 'vitest';
import { semanticDiff, formatJSON } from './semanticDiff';

describe('semanticDiff', () => {
  describe('semanticDiff function', () => {
    it('should return delta, left and right for identical objects', () => {
      const obj = { name: 'Alice', age: 30 };
      const result = semanticDiff(obj, obj);
      
      expect(result).toHaveProperty('delta');
      expect(result).toHaveProperty('left');
      expect(result).toHaveProperty('right');
      expect(result.delta).toBeUndefined(); // No differences
    });

    it('should detect added properties', () => {
      const left = { name: 'Alice' };
      const right = { name: 'Alice', age: 30 };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
      expect(result.delta).toHaveProperty('age');
    });

    it('should detect removed properties', () => {
      const left = { name: 'Alice', age: 30 };
      const right = { name: 'Alice' };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
      expect(result.delta).toHaveProperty('age');
    });

    it('should detect modified properties', () => {
      const left = { name: 'Alice', age: 30 };
      const right = { name: 'Alice', age: 31 };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
      expect(result.delta).toHaveProperty('age');
    });

    it('should normalize object property order before comparison', () => {
      const left = { z: 1, a: 2, m: 3 };
      const right = { a: 2, m: 3, z: 1 };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeUndefined(); // Should be identical after normalization
      expect(Object.keys(result.left)).toEqual(['a', 'm', 'z']);
      expect(Object.keys(result.right)).toEqual(['a', 'm', 'z']);
    });

    it('should handle nested objects', () => {
      const left = {
        user: { name: 'Alice', age: 30 },
        config: { enabled: true },
      };
      const right = {
        user: { name: 'Alice', age: 31 },
        config: { enabled: true },
      };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
      expect(result.delta).toHaveProperty('user');
    });

    it('should handle arrays with primitive values', () => {
      const left = { items: [1, 2, 3] };
      const right = { items: [1, 2, 4] };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
    });

    it('should detect array items with id field', () => {
      const left = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      };
      const right = {
        users: [
          { id: 1, name: 'Alice Updated' },
          { id: 2, name: 'Bob' },
        ],
      };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
      expect(result.delta).toHaveProperty('users');
    });

    it('should detect moved array items', () => {
      const left = {
        items: [
          { id: 1, value: 'first' },
          { id: 2, value: 'second' },
        ],
      };
      const right = {
        items: [
          { id: 2, value: 'second' },
          { id: 1, value: 'first' },
        ],
      };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
      // Should detect as move rather than delete+add
    });

    it('should handle empty objects', () => {
      const result = semanticDiff({}, {});
      
      expect(result.delta).toBeUndefined();
      expect(result.left).toEqual({});
      expect(result.right).toEqual({});
    });

    it('should handle null values', () => {
      const left = { value: null };
      const right = { value: null };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeUndefined();
    });

    it('should detect null to value changes', () => {
      const left = { value: null };
      const right = { value: 'something' };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
      expect(result.delta).toHaveProperty('value');
    });

    it('should handle complex nested structures', () => {
      const left = {
        users: [
          {
            id: 1,
            profile: { name: 'Alice', settings: { theme: 'dark' } },
          },
        ],
        config: { timeout: 5000 },
      };
      const right = {
        users: [
          {
            id: 1,
            profile: { name: 'Alice', settings: { theme: 'light' } },
          },
        ],
        config: { timeout: 5000 },
      };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
    });

    it('should normalize nested object properties', () => {
      const left = {
        outer: { z: 1, a: 2 },
      };
      const right = {
        outer: { a: 2, z: 1 },
      };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeUndefined();
      expect(Object.keys(result.left.outer)).toEqual(['a', 'z']);
    });

    it('should handle arrays with objects without id field', () => {
      const left = {
        items: [
          { name: 'Apple', price: 1.0 },
          { name: 'Banana', price: 0.5 },
        ],
      };
      const right = {
        items: [
          { name: 'Apple', price: 1.2 },
          { name: 'Banana', price: 0.5 },
        ],
      };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
    });

    it('should handle boolean values', () => {
      const left = { enabled: true };
      const right = { enabled: false };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
      expect(result.delta).toHaveProperty('enabled');
    });

    it('should handle number values', () => {
      const left = { count: 5, price: 10.5 };
      const right = { count: 5, price: 12.5 };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
      expect(result.delta).toHaveProperty('price');
      expect(result.delta).not.toHaveProperty('count');
    });

    it('should handle empty arrays', () => {
      const left = { items: [] };
      const right = { items: [] };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeUndefined();
    });

    it('should detect added array items', () => {
      const left = { items: [1, 2] };
      const right = { items: [1, 2, 3] };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
    });

    it('should detect removed array items', () => {
      const left = { items: [1, 2, 3] };
      const right = { items: [1, 2] };
      
      const result = semanticDiff(left, right);
      
      expect(result.delta).toBeDefined();
    });
  });

  describe('formatJSON function', () => {
    it('should format simple object with 2-space indentation', () => {
      const obj = { name: 'Alice', age: 30 };
      const result = formatJSON(obj);
      
      expect(result).toBe('{\n  "name": "Alice",\n  "age": 30\n}');
    });

    it('should format nested objects', () => {
      const obj = {
        user: {
          name: 'Alice',
        },
      };
      const result = formatJSON(obj);
      
      expect(result).toContain('"user"');
      expect(result).toContain('"name"');
      expect(result).toContain('Alice');
    });

    it('should format arrays', () => {
      const obj = { items: [1, 2, 3] };
      const result = formatJSON(obj);
      
      expect(result).toContain('[');
      expect(result).toContain(']');
      expect(result).toContain('1');
      expect(result).toContain('2');
      expect(result).toContain('3');
    });

    it('should handle null values', () => {
      const obj = { value: null };
      const result = formatJSON(obj);
      
      expect(result).toContain('null');
    });

    it('should handle boolean values', () => {
      const obj = { enabled: true, disabled: false };
      const result = formatJSON(obj);
      
      expect(result).toContain('true');
      expect(result).toContain('false');
    });

    it('should handle empty objects', () => {
      const result = formatJSON({});
      
      expect(result).toBe('{}');
    });

    it('should handle empty arrays', () => {
      const result = formatJSON([]);
      
      expect(result).toBe('[]');
    });

    it('should handle strings with special characters', () => {
      const obj = { text: 'Hello "World"\nNew line' };
      const result = formatJSON(obj);
      
      expect(result).toContain('Hello');
      expect(result).toContain('\\n'); // Escaped newline
    });

    it('should format numbers correctly', () => {
      const obj = { int: 42, float: 3.14, negative: -5 };
      const result = formatJSON(obj);
      
      expect(result).toContain('42');
      expect(result).toContain('3.14');
      expect(result).toContain('-5');
    });

    it('should handle complex nested structures', () => {
      const obj = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        config: {
          timeout: 5000,
          enabled: true,
        },
      };
      const result = formatJSON(obj);
      
      expect(result).toContain('users');
      expect(result).toContain('config');
      expect(result).toContain('Alice');
      expect(result).toContain('5000');
    });
  });
});

