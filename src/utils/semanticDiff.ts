import * as jsondiffpatch from 'jsondiffpatch';
import { sortObjectProperties } from './jsonNormalizer';

// Priority fields removed; matching and sorting now derive keys from data itself

// ---- Pair-aware normalization helpers ----

function deepClone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function defineNonEnum(target: any, key: string, value: any) {
  if (target && typeof target === 'object') {
    Object.defineProperty(target, key, {
      value,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }
}

function isPlainObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function serializeSorted(obj: any): string {
  return JSON.stringify(sortObjectProperties(obj));
}

function omitField(obj: any, field?: string): any {
  if (!field || !isPlainObject(obj)) return obj;
  const copy: any = {};
  for (const k of Object.keys(obj)) {
    if (k === field) continue;
    copy[k] = obj[k];
  }
  return copy;
}

function serializeWithoutField(obj: any, field?: string): string {
  return JSON.stringify(sortObjectProperties(omitField(obj, field)));
}

function findUniqueKeyCommonToBoth(arr1: any[], arr2: any[]): string | undefined {
  const getCandidateKeys = (arr: any[]): Set<string> => {
    const keys = new Set<string>();
    if (arr.length === 0) return keys;
    const objectItems = arr.filter((it) => isPlainObject(it));
    if (objectItems.length !== arr.length) return keys;

    // keys present in all items
    const intersection = new Set<string>(Object.keys(objectItems[0]));
    for (const item of objectItems.slice(1)) {
      for (const key of Array.from(intersection)) {
        if (!(key in item) || item[key] === null || item[key] === undefined) {
          intersection.delete(key);
        }
      }
    }

    // only keep keys with unique values
    const uniqueKeys = new Set<string>();
    for (const key of intersection) {
      const values = objectItems.map((it) => String(it[key]));
      const unique = new Set(values);
      if (unique.size === values.length) uniqueKeys.add(key);
    }
    return uniqueKeys;
  };

  const c1 = getCandidateKeys(arr1);
  const c2 = getCandidateKeys(arr2);
  const common = Array.from(c1).filter((k) => c2.has(k));
  if (common.length === 0) return undefined;
  return common.sort()[0];
}

function multisetEqualBySerializationIgnoringField(arr1: any[], arr2: any[], field: string): boolean {
  const freq = (arr: any[]) => {
    const map = new Map<string, number>();
    for (const it of arr) {
      const key = serializeWithoutField(it, field);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  };
  const m1 = freq(arr1);
  const m2 = freq(arr2);
  if (m1.size !== m2.size) return false;
  for (const [k, v] of m1) {
    if (m2.get(k) !== v) return false;
  }
  return true;
}

type MatchStrategy = 'id' | 'content';

function alignArraysForDiff(leftArr: any[], rightArr: any[]): { left: any[]; right: any[]; strategy: MatchStrategy; field?: string } {
  // Arrays of primitives -> sort by string representation
  const leftIsObject = leftArr.every((it) => isPlainObject(it));
  const rightIsObject = rightArr.every((it) => isPlainObject(it));

  if (!leftIsObject || !rightIsObject) {
    const primitiveComparator = (a: unknown, b: unknown): number => {
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a).localeCompare(String(b));
    };
    const l = [...leftArr].map(deepClone).sort(primitiveComparator);
    const r = [...rightArr].map(deepClone).sort(primitiveComparator);
    return { left: l, right: r, strategy: 'content' };
  }

  const field = findUniqueKeyCommonToBoth(leftArr, rightArr);
  let strategy: MatchStrategy = 'content';
  let matchField: string | undefined = undefined;

  if (field) {
    if (multisetEqualBySerializationIgnoringField(leftArr, rightArr, field)) {
      strategy = 'content';
      matchField = field;
    } else {
      strategy = 'id';
      matchField = field;
    }
  } else {
    strategy = 'content';
  }

  const sortKey = (item: any): string => {
    if (strategy === 'id' && matchField) {
      const v = item?.[matchField];
      if (typeof v === 'number') return `#${v}`;
      return `#${String(v)}`;
    }
    if (strategy === 'content' && matchField) {
      return serializeWithoutField(item, matchField);
    }
    return serializeSorted(item);
  };

  const lSorted = leftArr.map(deepClone).sort((a, b) => {
    const keyA = sortKey(a);
    const keyB = sortKey(b);
    if (keyA !== keyB) return keyA.localeCompare(keyB);
    // When keys are equal, use full serialization as tiebreaker for deterministic sort
    return serializeSorted(a).localeCompare(serializeSorted(b));
  });
  const rSorted = rightArr.map(deepClone).sort((a, b) => {
    const keyA = sortKey(a);
    const keyB = sortKey(b);
    if (keyA !== keyB) return keyA.localeCompare(keyB);
    // When keys are equal, use full serialization as tiebreaker for deterministic sort
    return serializeSorted(a).localeCompare(serializeSorted(b));
  });

  // annotate items for hashing strategy
  for (const it of lSorted) {
    defineNonEnum(it, '__match_strategy', strategy);
    if (matchField) defineNonEnum(it, '__match_field', matchField);
  }
  for (const it of rSorted) {
    defineNonEnum(it, '__match_strategy', strategy);
    if (matchField) defineNonEnum(it, '__match_field', matchField);
  }

  // recurse pairwise to normalize nested structures
  const maxLen = Math.max(lSorted.length, rSorted.length);
  const lOut: any[] = [];
  const rOut: any[] = [];
  for (let i = 0; i < maxLen; i++) {
    const lItem = lSorted[i];
    const rItem = rSorted[i];
    if (lItem !== undefined && rItem !== undefined) {
      const [ln, rn] = normalizeForDiff(lItem, rItem);
      lOut.push(ln);
      rOut.push(rn);
    } else if (lItem !== undefined) {
      lOut.push(lItem);
    } else if (rItem !== undefined) {
      rOut.push(rItem);
    }
  }

  return { left: lOut, right: rOut, strategy, field: matchField };
}

function normalizeForDiff(left: any, right: any): [any, any] {
  if (Array.isArray(left) && Array.isArray(right)) {
    const { left: la, right: ra } = alignArraysForDiff(left, right);
    return [la, ra];
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const allKeys = new Set<string>([...Object.keys(left), ...Object.keys(right)]);
    const lOut: any = {};
    const rOut: any = {};
    for (const key of Array.from(allKeys)) {
      if (key in left && key in right) {
        const [ln, rn] = normalizeForDiff(left[key], right[key]);
        lOut[key] = ln;
        rOut[key] = rn;
      } else if (key in left) {
        lOut[key] = deepClone(left[key]);
      } else if (key in right) {
        rOut[key] = deepClone(right[key]);
      }
    }
    // Preserve matching annotations if present on the original items
    const lStrat = (left as any)['__match_strategy'];
    const lField = (left as any)['__match_field'];
    if (lStrat !== undefined) defineNonEnum(lOut, '__match_strategy', lStrat);
    if (lField !== undefined) defineNonEnum(lOut, '__match_field', lField);
    const rStrat = (right as any)['__match_strategy'];
    const rField = (right as any)['__match_field'];
    if (rStrat !== undefined) defineNonEnum(rOut, '__match_strategy', rStrat);
    if (rField !== undefined) defineNonEnum(rOut, '__match_field', rField);
    return [lOut, rOut];
  }

  // Fallback: return values as-is (or deep clone to be safe)
  return [deepClone(left), deepClone(right)];
}

/**
 * Single-side normalization for display: mirrors diff rules without a peer
 * - Sorts object properties
 * - Sorts arrays deterministically
 *   - Primitives: by string value
 *   - Objects: by priority id-like field when uniquely present on all items; otherwise by sorted JSON content
 */
function normalizeForDisplay(value: any): any {
  if (Array.isArray(value)) {
    const items = value.map((v) => (isPlainObject(v) || Array.isArray(v) ? normalizeForDisplay(v) : deepClone(v)));

    const allObjects = items.every((it) => isPlainObject(it));
    if (!allObjects) {
      const primitiveComparator = (a: unknown, b: unknown): number => {
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b));
      };
      return items.slice().sort(primitiveComparator);
    }

    // Determine a stable sort key derived from data: pick any key present on all
    // items with unique values; prefer lexicographically smallest key name
    const candidateField = (() => {
      if (items.length === 0) return undefined;
      const keysIntersection = new Set<string>(Object.keys(items[0] as any));
      for (const it of items.slice(1)) {
        for (const k of Array.from(keysIntersection)) {
          if (!(k in (it as any)) || (it as any)[k] === null || (it as any)[k] === undefined) {
            keysIntersection.delete(k);
          }
        }
      }
      const candidates: string[] = [];
      for (const k of keysIntersection) {
        const values = items.map((it: any) => String((it as any)[k]));
        if (new Set(values).size === values.length) candidates.push(k);
      }
      if (candidates.length === 0) return undefined;
      return candidates.sort()[0];
    })();

    const sortKey = (item: any): string => {
      if (candidateField) {
        const v = item[candidateField];
        return typeof v === 'number' ? `#${v}` : `#${String(v)}`;
      }
      return serializeSorted(item);
    };

    return items.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  }

  if (isPlainObject(value)) {
    const out: any = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = normalizeForDisplay((value as any)[key]);
    }
    // Preserve non-enumerable matching annotations if present
    const strat = (value as any)['__match_strategy'];
    const field = (value as any)['__match_field'];
    if (strat !== undefined) defineNonEnum(out, '__match_strategy', strat);
    if (field !== undefined) defineNonEnum(out, '__match_field', field);
    return out;
  }

  return deepClone(value);
}

/**
 * Creates a custom differ with smart array matching
 */
function createSemanticDiffer() {
  // Create differ with custom array matching
  const differ = jsondiffpatch.create({
    objectHash: function(item: any) {
      // Respect precomputed matching strategy annotations when present
      if (item && typeof item === 'object') {
        const strat = (item as any)['__match_strategy'] as MatchStrategy | undefined;
        const field = (item as any)['__match_field'] as string | undefined;
        if (strat === 'id' && field && field in item) {
          return `${field}:${(item as any)[field]}`;
        }
        if (strat === 'content') {
          if (field) {
            return `content:${serializeWithoutField(item, field)}`;
          }
          return `content:${serializeSorted(item)}`;
        }
        // Without priority fields, fall back to content-based hashing
      }
      // Fallback to stringified object
      return JSON.stringify(sortObjectProperties(item));
    },
    arrays: {
      detectMove: true,
      includeValueOnMove: false,
    },
  });

  return differ;
}

/**
 * Performs semantic diff between two JSON objects
 */
export function semanticDiff(left: any, right: any): any {
  // Pair-aware preprocessing (align arrays), then sort properties
  const [normLeft, normRight] = normalizeForDiff(left, right);
  const processedLeft = sortObjectProperties(normLeft);
  const processedRight = sortObjectProperties(normRight);

  // Create custom differ
  const differ = createSemanticDiffer();

  // Perform diff
  const delta = differ.diff(processedLeft, processedRight);

  return {
    delta,
    left: processedLeft,
    right: processedRight,
  };
}

/**
 * Formats JSON for display with normalization
 */
export function formatJSON(obj: any, normalize: boolean = false): string {
  if (normalize) {
    const normalized = normalizeForDisplay(obj);
    return JSON.stringify(normalized, null, 2);
  }
  return JSON.stringify(obj, null, 2);
}

