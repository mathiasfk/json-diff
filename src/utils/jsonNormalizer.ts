/**
 * Utility functions for normalizing JSON structures before comparison
 */

export interface ArrayMatchStrategy {
  field?: string;
  useSimilarity: boolean;
}

/**
 * Detects the best field to use for matching array items
 */
export function detectArrayMatchField(
  arr1: any[],
  arr2: any[]
): ArrayMatchStrategy {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
    return { useSimilarity: false };
  }

  if (arr1.length === 0 || arr2.length === 0) {
    return { useSimilarity: false };
  }

  // Priority fields to check
  const priorityFields = ['id', 'index', 'name', 'key', 'uuid', '_id'];

  // Check if items are objects
  const hasObjects1 = arr1.some(item => typeof item === 'object' && item !== null);
  const hasObjects2 = arr2.some(item => typeof item === 'object' && item !== null);

  if (!hasObjects1 || !hasObjects2) {
    return { useSimilarity: false };
  }

  // Get all property keys from both arrays
  const keys1 = new Set<string>();
  const keys2 = new Set<string>();

  arr1.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => keys1.add(key));
    }
  });

  arr2.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => keys2.add(key));
    }
  });

  // Find common keys
  const commonKeys = Array.from(keys1).filter(key => keys2.has(key));

  if (commonKeys.length === 0) {
    return { useSimilarity: true };
  }

  // Try priority fields first
  for (const field of priorityFields) {
    if (commonKeys.includes(field)) {
      // Check if this field has unique values in both arrays
      const values1 = arr1
        .filter(item => typeof item === 'object' && item !== null && field in item)
        .map(item => item[field]);
      const values2 = arr2
        .filter(item => typeof item === 'object' && item !== null && field in item)
        .map(item => item[field]);

      const uniqueValues1 = new Set(values1);
      const uniqueValues2 = new Set(values2);

      // Field should have unique values and be present in all items
      if (
        uniqueValues1.size === arr1.length &&
        uniqueValues2.size === arr2.length &&
        values1.length === arr1.length &&
        values2.length === arr2.length
      ) {
        return { field, useSimilarity: false };
      }
    }
  }

  // Fall back to similarity-based matching
  return { useSimilarity: true };
}

/**
 * Calculates similarity score between two objects (0-1)
 */
export function calculateSimilarity(obj1: any, obj2: any): number {
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2 ? 1 : 0;
  }

  if (obj1 === null || obj2 === null) {
    return obj1 === obj2 ? 1 : 0;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  const allKeys = new Set([...keys1, ...keys2]);

  if (allKeys.size === 0) return 1;

  let matches = 0;
  let total = allKeys.size;

  allKeys.forEach(key => {
    if (key in obj1 && key in obj2) {
      if (JSON.stringify(obj1[key]) === JSON.stringify(obj2[key])) {
        matches += 1;
      } else {
        // Partial match for same key with different value
        matches += 0.5;
      }
    }
  });

  return matches / total;
}

/**
 * Sorts object properties alphabetically
 */
export function sortObjectProperties(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectProperties(item));
  }

  const sorted: any = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    sorted[key] = sortObjectProperties(obj[key]);
  }

  return sorted;
}

/**
 * Creates a hash function for array items based on the matching strategy
 */
export function createObjectHashFunction(strategy: ArrayMatchStrategy): (item: any, index: number) => string {
  if (strategy.field) {
    // Use the specified field for matching
    return (item: any) => {
      if (typeof item === 'object' && item !== null && strategy.field! in item) {
        return String(item[strategy.field!]);
      }
      return JSON.stringify(sortObjectProperties(item));
    };
  }

  // Use full object serialization
  return (item: any) => {
    return JSON.stringify(sortObjectProperties(item));
  };
}

