# Integration Guide

## How Components Work Together

This document explains how the different parts of the smart JSON diff application integrate to provide a seamless user experience for comparing JSON objects semantically.

## Data Flow Overview

The application follows a unidirectional data flow pattern typical of React applications:

```
User Actions → Event Handlers → State Updates → Re-render → UI Updates
```

### Detailed Data Flow

1. **User Input Phase**
   - User types JSON into left/right editors (`JsonEditor` components)
   - `onChange` handlers update React state (`leftJson`, `rightJson`)
   - LocalStorage persistence saves inputs automatically

2. **Comparison Trigger**
   - User clicks "Compare JSONs" button
   - `handleCompare()` function executes:
     - Resets error states
     - Tracks analytics event
     - Validates JSON inputs
     - If valid, calls `semanticDiff()` utility function
     - Formats results for display
     - Updates comparison result state
     - Switches view mode to 'compare'

3. **Processing Phase** (inside `semanticDiff()`)
   - Input objects are normalized via `normalizeForDiff()`
   - Object properties are sorted
   - Custom jsondiffpatch differ is created
   - Diff operation is performed
   - Raw diff result and normalized objects are returned

4. **Display Phase**
   - `App` component passes formatted JSON strings to `DiffViewer`
   - `DiffViewer` renders Monaco Editor side-by-side view
   - If no differences, shows "JSONs are equivalent!" message
   - User can reset to edit view using the back button

## Key Integration Points

### 1. App ↔ Utils Integration

**File**: `src/App.tsx` ↔ `src/utils/semanticDiff.ts`

**Interaction**:
- App imports and uses `semanticDiff()` and `formatJSON()` functions
- App handles error states and validation before calling utils
- Utils remain pure functions with no React dependencies
- TypeScript interfaces ensure proper data exchange

**Data Contract**:
```typescript
// From App to semanticDiff
semanticDiff(leftParsed: any, rightParsed: any): {
  delta: any;          // jsondiffpatch delta object
  left: any;           // normalized left object
  right: any;          // normalized right object
}

// From semanticDiff to App (via formatJSON)
formatJSON(obj: any, normalize: boolean = false): string
```

### 2. App ↔ Components Integration

**File**: `src/App.tsx` ↔ `src/components/*`

**Interaction**:
- App renders components based on state (`viewMode`)
- App passes data and handlers as props
- Components communicate back to App via callback props
- State is lifted up to App component

**Props Contract**:

**JsonEditor**:
```tsx
<JsonEditor
  value={string}           // Current JSON text
  onChange={(text: string) => void}  // Input handler
  error={string}           // Validation error message
  label={string}           // Field label
  side={'left' | 'right'}  // For analytics
/>
```

**DiffViewer**:
```tsx
<DiffViewer
  oldValue={string}        // Formatted left JSON
  newValue={string}        // Formatted right JSON
  onReset={() => void}     // Return to edit mode
  hasDifferences={boolean} // Show differences or equivalency message
/>
```

**Header** (simpler, no props):
```tsx
<Header />
```

### 3. Components ↔ External Libraries

**JsonEditor** ↔ Monaco Editor (via @monaco-editor/react)
- Uses Monaco editor for syntax highlighting and editing
- Handles theme vs-dark for consistency with DiffViewer
- Provides basic validation and error highlighting

**DiffViewer** ↔ Monaco Editor (via @monaco-editor/react)
- Configures side-by-side diff view
- Sets readOnly mode for comparison
- Customizes editor options (font size, minimap disabled, etc.)

**App** ↔ jsondiffpatch (via utils/semanticDiff.ts)
- Creates customized differ instance
- Provides custom object hashing for semantic matching
- Configures array move detection

### 4. Services Integration

**Analytics Service** (`src/services/analytics.js`)
- Simple wrapper around `gtag()` function
- Used throughout App.tsx for tracking user interactions
- Events tracked:
  - compare_click: Initiation of comparison
  - invalid_json: When user inputs invalid JSON
  - compare_completed: When comparison finishes
  - back_to_edit: Returning to edit view
  - format_click: Formatting JSON inputs
  - clear_click: Clearing input fields

### 5. Persistence Layer

**LocalStorage Integration** (in App.tsx)
- Automatically saves JSON inputs and UI state
- Keys defined in LS_KEYS object:
  - jsonDiff.left: Left JSON input
  - jsonDiff.right: Right JSON input
  - jsonDiff.viewMode: Current view (edit/compare)
  - jsonDiff.diffResult: Last comparison result
- Loaded on initial render via useEffect hook
- Saved on state changes via useEffect hooks

## Integration Patterns Used

### 1. Controlled Components Pattern
- JsonEditor components are controlled by React state
- Value prop comes from state, onChange updates state
- Enables features like input validation and formatting

### 2. Lifted State
- Application state lives in App component
- Child components receive state as props and communicate via callbacks
- Prevents prop drilling for this simple app
- Makes state mutations predictable

### 3. Separation of Concerns
- UI components focus on presentation and user interaction
- Utils focus on pure algorithms and data transformation
- Services focus on external integrations
- App orchestrates the flow between layers

### 4. Immutable Data Flow
- Utils functions don't mutate inputs
- New objects are created for normalized versions
- React state updates use setter functions
- Prevents unexpected side effects

## Extension Points

### Adding New Features

1. **New Comparison Algorithms**
   - Add new functions in src/utils/ (e.g., semanticDiffV2.ts)
   - Update App.tsx to conditionally use different algorithms
   - Add algorithm selection UI in Header or toolbar

2. **Additional Output Formats**
   - Create new formatting functions in utils/
   - Add export/download buttons in DiffViewer
   - Support for JSON patch, side-by-side XML, etc.

3. **Enhanced Analytics**
   - Track specific diff types (array moves, value changes, etc.)
   - Measure comparison performance
   - User behavior funnels

4. **Theming Support**
   - Add theme context (light/dark mode)
   - Update Monaco Editor themes
   - Persist theme preference in LocalStorage

5. **History/Audit Trail**
   - Store comparison history in LocalStorage
   - Add history panel to view past comparisons
   - Export/import comparison sessions

## Technical Constraints and Considerations

### Bundle Size
- Monaco Editor is large (~2MB) - loaded lazily via React.lazy
- Only loads when user navigates to compare view
- jsonndiffpatch is small (~50KB gzipped)

### Performance
- Comparison runs on main thread - could block UI with huge JSONs
- Consider web workers for large inputs (>100KB)
- Memoization opportunities in normalization functions

### Browser Compatibility
- Modern browsers only (React 18+ requirements)
- Monaco Editor requires reasonably recent browsers
- LocalStorage usage assumes modern browser support

### Security
- JSON parsing could be vulnerable to prototype poisoning
- Current validation is basic - consider additional safeguards
- No external data fetching reduces attack surface

## Example Integration Sequence

Here's what happens when a user compares two JSON objects:

1. **User Types**: 
   ```
   Left:  {"z": 1, "a": 2}
   Right: {"a": 2, "z": 1}
   ```

2. **State Updates**: 
   - leftJson and rightJson state updated via JsonEditor onChange
   - LocalStorage automatically persisted

3. **Compare Clicked**:
   - handleCompare() called
   - Analytics: compare_click event sent
   - Inputs validated (both valid JSON)
   - semanticDiff({z: 1, a: 2}, {a: 2, z: 1}) called

4. **Inside semanticDiff()**:
   - normalizeForDiff processes both objects
   - Objects normalized to {a: 2, z: 1} (sorted properties)
   - jsondiffpatch compares identical objects
   - Returns { delta: undefined, left: {a: 2, z: 1}, right: {a: 2, z: 1} }

5. **Result Processing**:
   - formatJSON(result.left, true) → '{\n  "a": 2,\n  "z": 1\n}'
   - formatJSON(result.right, true) → same output
   - hasDifferences = (undefined !== undefined) = false
   - diffResult state updated
   - viewMode set to 'compare'

6. **UI Update**:
   - App renders DiffViewer instead of editors
   - DiffViewer receives identical strings
   - Sees hasDifferences = false
   - Shows "JSONs are equivalent!" message

7. **User Interaction**:
   - User clicks back button
   - handleReset() called
   - viewMode set to 'edit'
   - Editors reappear with original inputs

## Dependency Injection Points

While the app doesn't use a formal DI container, these locations allow behavior modification:

1. **semanticDiff.ts**: Replace or wrap the core algorithm
2. **createSemanticDiffer()**: Modify jsondiffpatch configuration
3. **normalizeForDiff()/alignArraysForDiff()**: Change normalization logic
4. **formatJSON()**: Alter output formatting
5. **App.tsx event handlers**: Modify UI flow or add steps
6. **services/analytics.js**: Change tracking implementation or endpoint

## Contract Testing Considerations

When modifying integration points, ensure these contracts are maintained:

### App ↔ Utils
- semanticDiff always returns {delta, left, right} objects
- formatJSON always returns string
- Utils functions are pure (no side effects)
- Error handling stays in App layer

### App ↔ Components
- JsonEditor: value/onChange/error/label/side props
- DiffViewer: oldValue/newValue/onReset/hasDifferences props
- Components don't directly modify App state
- All communication via props and callbacks

### External Libraries
- @monaco-editor/react: Used as DiffEditor component
- jsondiffpatch: Used via create() and diff() methods
- gtag: Used via analytics.js wrapper

## Future-Proofing

Integration points designed to accommodate growth:

1. **Algorithm Swapping**: Core diff logic isolated in utils/
2. **UI Framework Independence**: Components could be adapted to other frameworks
3. **Analytics Abstraction**: Tracking wrapped in service layer
4. **Persistence Abstraction**: LocalStorage usage contained in App
5. **Type Safety**: TypeScript interfaces protect against breaking changes

This modular structure allows the application to evolve while maintaining clear separation between concerns.