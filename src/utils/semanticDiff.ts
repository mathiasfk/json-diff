import * as jsondiffpatch from 'jsondiffpatch';
import {
  sortObjectProperties,
} from './jsonNormalizer';

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
        const priorityFields = ['id', 'index', 'name', 'key', 'uuid', '_id'];
        for (const field of priorityFields) {
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
  // Preprocess both objects (sort properties)
  const processedLeft = sortObjectProperties(left);
  const processedRight = sortObjectProperties(right);

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
 * Formats JSON for display
 */
export function formatJSON(obj: any): string {
  return JSON.stringify(obj, null, 2);
}

