import * as jsondiffpatch from 'jsondiffpatch';
import {
  sortObjectProperties,
} from './jsonNormalizer';

/**
 * Priority fields to use for sorting/matching array items
 */
const PRIORITY_FIELDS = ['id', 'index', 'name', 'key', 'uuid', '_id'];

/**
 * Normalizes arrays by sorting objects with identifiable fields
 */
function normalizeArrays(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    // Check if this is an array of objects with identifiable fields
    if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
      // Find if there's a priority field that all items have
      let sortField: string | null = null;
      
      for (const field of PRIORITY_FIELDS) {
        if (obj.every(item => 
          typeof item === 'object' && 
          item !== null && 
          field in item && 
          item[field] !== null && 
          item[field] !== undefined
        )) {
          sortField = field;
          break;
        }
      }
      
      // Sort the array by the identified field
      if (sortField) {
        const sorted = [...obj].sort((a, b) => {
          const valA = a[sortField!];
          const valB = b[sortField!];
          
          // Handle different types
          if (typeof valA === 'number' && typeof valB === 'number') {
            return valA - valB;
          }
          return String(valA).localeCompare(String(valB));
        });
        
        // Recursively normalize nested structures
        return sorted.map(item => normalizeArrays(item));
      }
    }
    
    // For arrays without identifiable fields, just normalize nested items
    return obj.map(item => normalizeArrays(item));
  }

  // For objects, normalize all nested values
  const normalized: any = {};
  for (const key of Object.keys(obj)) {
    normalized[key] = normalizeArrays(obj[key]);
  }
  return normalized;
}

/**
 * Creates a custom differ with smart array matching
 */
function createSemanticDiffer() {
  // Create differ with custom array matching
  const differ = jsondiffpatch.create({
    objectHash: function(item: any) {
      // Try to determine which array we're in based on context
      // This is a simplified approach - jsondiffpatch will call this for each array
      
      if (typeof item === 'object' && item !== null) {
        // Try priority fields
        for (const field of PRIORITY_FIELDS) {
          if (field in item && item[field] !== null && item[field] !== undefined) {
            return `${field}:${item[field]}`;
          }
        }
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
  // Preprocess both objects (normalize arrays, then sort properties)
  const normalizedLeft = normalizeArrays(left);
  const normalizedRight = normalizeArrays(right);
  
  const processedLeft = sortObjectProperties(normalizedLeft);
  const processedRight = sortObjectProperties(normalizedRight);

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
    const normalized = normalizeArrays(obj);
    const sorted = sortObjectProperties(normalized);
    return JSON.stringify(sorted, null, 2);
  }
  return JSON.stringify(obj, null, 2);
}

