# Diff Algorithm Documentation

## Overview

The comparator offers two array modes. Automatic alignment uses custom preprocessing and [jsondiffpatch](https://github.com/benjamine/jsondiffpatch); positional comparison recursively pairs items by index and produces a jsondiffpatch-compatible delta. Both ignore object property order.

## Core Algorithm: Myers Diff

In automatic alignment, jsondiffpatch uses the **Myers diff algorithm** for sequences, which:
- Finds the shortest middle snake (edit script) between two sequences
- Has O(ND) time complexity where N is the sum of sequence lengths and D is the number of differences
- Space complexity of O(N) for the linear space refinement
- Produces minimal edit scripts (optimal in terms of insertions/deletions)

## Enhanced Features

Beyond the standard Myers diff, our implementation adds several semantic-aware enhancements:

### 1. Object Property Normalization
Before diffing, object properties are sorted lexicographically to ensure that reordering of properties doesn't appear as differences.

### 2. Smart Array Matching
In automatic alignment, arrays are processed with special alignment strategies:
- **ID-based matching**: When array elements have a uniquely identifying field (like `id`) present in all elements, arrays are aligned by that field
- **Content-based matching**: When no suitable ID field exists, arrays are sorted by serialized content for deterministic comparison
- **Primitive arrays**: Sorted by their string/number values

### 3. Custom Object Hashing
The jsondiffpatch library uses object hashing to identify matching elements. We've customized this to:
- Respect precomputed matching strategy annotations (`__match_strategy` and `__match_field`)
- Fall back to content-based hashing when no special strategy is applicable
- Use `content:{field}:{value}` format for content-based matching
- Use `{field}:{value}` format for ID-based matching

### 4. Recursive Normalization
Both modes process nested objects and arrays recursively. Positional comparison preserves array order and compares each index; an insertion can therefore also change comparisons at subsequent indices. JSONL records are parsed into an array and follow the selected mode.

## Key Functions

### `semanticDiff(left, right, options)`
The optional `options.arrayComparison` selects `semantic` (automatic alignment, the default) or `position`. The semantic path aligns arrays, sorts object properties and runs a custom jsondiffpatch differ. The positional path sorts object properties, preserves arrays and calculates the delta recursively by index. Both return `{ delta, left, right }` where:
   - `delta`: The diff patch (undefined if no differences)
   - `left`: Normalized left object
   - `right`: Normalized right object

### `normalizeForDiff(left, right)`
Preprocesses two objects for comparison by:
- Recursively normalizing arrays using `alignArraysForDiff`
- Recursively normalizing object properties
- Preserving matching strategy annotations

### `alignArraysForDiff(leftArr, rightArr)`
Implements smart array alignment:
- For primitive arrays: sorts by string/number value
- For object arrays: 
  - Attempts to find a unique key common to all objects
  - If found and values are equal when ignoring that field -> content strategy
  - If found but values differ -> ID strategy
  - If no common unique key -> content strategy
- Annotates sorted arrays with matching strategy for use in object hashing

### `createSemanticDiffer()`
Configures jsondiffpatch with:
- Custom `objectHash` function that respects matching annotations
- Array move detection enabled
- Standard text diffing for values

## Time and Space Complexity

### Base Complexity (from jsondiffpatch/Myers diff):
- Time: O((N+L)D) where N and L are sequence lengths, D is number of deletions
- Space: O(N+L) for the linear space refinement

### Additional Overhead from Preprocessing:
- Object property sorting: O(K log K) per object where K is number of properties
- Array sorting: O(M log M) per array where M is array length
- Recursive processing: Applied to all nested structures

These costs describe automatic alignment; similarity matching can add further overhead. Positional comparison walks the structures by index and also sorts object properties.

## Configuration Options

Pass `{ arrayComparison: 'position' }` to compare by index, or omit the option (or pass `'semantic'`) for automatic alignment. The UI persists the selected mode and records it with each result. The semantic differ configures custom `objectHash` and array move detection internally.

## Edge Cases Handled

1. **Empty objects/arrays**: Properly handled as equivalent when both empty
2. **Null values**: Treated as valid JSON values
3. **Undefined values**: Handled through deep cloning (preserved as undefined)
4. **Mixed types**: Type differences are detected as changes
5. **Circular references**: Not explicitly handled - relies on JSON.parse/stringify deep cloning which breaks circular references
6. **Very large arrays**: Performance degrades with array size due to sorting, but Mitchell's algorithm in jsondiffpatch helps
7. **Duplicate array elements with ID fields**: Handled through multiset equality checking
8. **Nested objects with ID fields**: Recursively processed at all levels

## Limitations

1. **Performance with large arrays**: Sorting large arrays can be expensive
2. **No customization of equality criteria**: Uses strict JSON equality after normalization
3. **Limited to JSON-compatible types**: Doesn't handle Date, RegExp, Function, etc. beyond basic types
4. **Array move detection**: jsondiffpatch's move detection may not catch all semantic moves in complex scenarios

## References

- [jsondiffpatch GitHub Repository](https://github.com/benjamine/jsondiffpatch)
- "An O(ND) Difference Algorithm and Its Variations" by Eugene Myers (1986)
- [Diffutils Algorithm Description](https://www.gnu.org/manual/diffutils/html_node/diff-algorithm.html)
