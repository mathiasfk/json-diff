# Project Structure Documentation

## High-Level Organization

The smart JSON diff application is organized as a modern React/Vite frontend application with TypeScript. The structure follows common web development patterns with clear separation of concerns.

### Directory Structure
```
├── src/                    # Source code
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page-level components (routes)
│   ├── services/           # External service integrations
│   ├── utils/              # Utility functions and helpers
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Application entry point
│   └── vite-env.d.ts       # Vite TypeScript definitions
├── public/                 # Static assets
├── test-data/              # Test JSON files
├── scripts/                # Build and utility scripts
├── docs/                   # Documentation (this directory)
├── .github/                # GitHub workflows and templates
├── index.html              # HTML entry point
├── package.json            # Project metadata and dependencies
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
└── README.md               # Project overview
```

## Core Modules and Their Responsibilities

### 1. Components (`src/components/`)
Reusable UI elements that encapsulate specific functionality:

- `DiffViewer.tsx`: Displays side-by-side JSON comparison using Monaco Editor
- `Header.tsx`: Application header with title and navigation

- `JsonEditor.tsx`: Custom JSON editor component with syntax highlighting and validation

### 2. Pages (`src/pages/`)
Route-specific components (currently using simple routing):

- `Faq.tsx`: Frequently asked questions page

### 3. Services (`src/services/`)
External integrations and API communications:

- `analytics.js`: Google Analytics integration (gtag wrapper)
- `analytics.d.ts`: TypeScript definitions for analytics service

### 4. Utilities (`src/utils/`)
Pure functions and helpers used throughout the application:

- `semanticDiff.ts`: Core diff algorithm implementation (detailed in algorithm.md)
- `semanticDiff.test.ts`: Comprehensive test suite for semanticDiff
- `jsonNormalizer.ts`: JSON normalization utilities
- `jsonNormalizer.test.ts`: Tests for normalization functions
- `semanticDiff.scenarios.test.js`: Scenario-based tests

### 5. Application Entry Points

- `main.tsx`: React application bootstrap with root rendering
- `App.tsx`: Main application component containing:
  - State management for JSON inputs and comparison results
  - Event handlers for user interactions
  - LocalStorage persistence logic
  - Validation and formatting utilities
  - Route logic (edit vs compare views)

### 6. Build and Configuration

- `vite.config.ts`: Vite configuration with plugins for:
  - React (`@vitejs/plugin-react`)
  - Monaco Editor (`vite-plugin-monaco-editor`)
- `tsconfig.json`: TypeScript configuration with strict mode enabled
- `postcss.config.js` & `tailwind.config.js`: Styling configuration
- `scripts/update-sitemap.js`: Node script for sitemap generation

## Entry Points and CLI Interfaces

### Web Application Entry Point
The application is accessed through a web browser via `index.html` which:
1. Loads the compiled JavaScript bundle
2. Initializes the React application
3. Mounts the App component to the DOM root

### Development Scripts (package.json)
Available npm/pnpm scripts:
- `dev`: Start development server with hot module replacement
- `build`: TypeScript compile + Vite production build
- `preview`: Preview production build locally
- `lint`: Run ESLint on TypeScript/TSX files
- `test`: Run Vitest unit tests
- `test:ui`: Run Vitest with UI interface
- `test:coverage`: Run tests with coverage reporting
- `prebuild`: Update sitemap before building

## Core Data Structures and Types

### TypeScript Interfaces and Types

From `src/App.tsx`:
```typescript
type ViewMode = 'edit' | 'compare';

// Diff result structure
{
  left: string;           // Formatted left JSON
  right: string;          // Formatted right JSON
  hasDifferences: boolean;// Whether differences were found
}
```

From `src/components/DiffViewer.tsx`:
```typescript
interface DiffViewerProps {
  oldValue: string;       // Original JSON string
  newValue: string;       // Modified JSON string
  onReset: () => void;    // Callback to return to edit mode
  hasDifferences: boolean;// Whether to show differences or "equivalent" message
}
```

### Internal Data Structures (from semanticDiff.ts)

#### Normalized Objects
After processing through `semanticDiff()`:
- Objects with sorted properties
- Arrays sorted by content or ID-based criteria
- Annotated with `__match_strategy` and `__match_field` properties for tracking

#### Diff Result (from jsondiffpatch)
The delta object follows jsondiffpatch format:
- `_t`: Object type change
- `_a`: Array modifications
- Property names: Value changes
- `_d`: Deleted properties

## Dependency Graph Between Modules

```
App.tsx
├── Header.tsx
├── JsonEditor.tsx
├── DiffViewer.tsx ← @monaco-editor/react
├── semanticDiff.ts ← jsondiffpatch
│   ├── jsonNormalizer.ts
│   └── normalizeForDiff logic
└── services/analytics.js
```

### External Dependencies (package.json)

**Production Dependencies:**
- `react` & `react-dom`: UI library
- `@monaco-editor/react` & `monaco-editor`: Code diff visualization
- `jsondiffpatch`: Core diff algorithm library
- `react-router-dom`: Client-side routing

**Development Dependencies:**
- `vite`: Build tool and dev server
- `@vitejs/plugin-react`: React JSX support
- `vite-plugin-monaco-editor`: Monaco Editor integration
- `vitest`: Testing framework
- `@types/react`: TypeScript definitions
- `eslint`: Code quality
- `tailwindcss` & `autoprefixer`: Styling
- `typescript`: TypeScript compiler

## Build/Test/Deploy Pipelines

### Development Workflow
1. `pnpm dev`: Starts Vite dev server at http://localhost:5173
2. Hot module replacement enables instant updates
3. ESLint runs on file save via editor integration
4. Vitest watches test files during development

### Build Process
1. `pnpm prebuild`: Runs `scripts/update-sitemap.js`
2. `pnpm build`: 
   - TypeScript compilation (`tsc`)
   - Vite production build with minification
   - Outputs to `dist/` directory
3. `pnpm preview`: Serves built application locally for testing

### Testing Pipeline
- Unit tests with Vitest (`pnpm test`)
- UI testing available with Vitest (`pnpm test:ui`)
- Coverage reporting (`pnpm test:coverage`)
- Test files co-located with source (`*.test.*`)

### Deployment (GitHub Actions + GitHub Pages)
As documented in `.github/workflows/`:
1. CI triggers on push to main and pull requests
2. Builds application with `pnpm build`
3. Deploys to GitHub Pages branch (`gh-pages`)
4. Provides live preview at https://mathiasfk.github.io/json-diff/

### Code Quality Checks
- ESLint with React hooks and refresh rules
- No warnings allowed (--max-warnings 0)
- TypeScript strict type checking
- Prettier formatting (implied by editor settings)

## Integration Guide

### How the Diff Algorithm Integrates with the System

#### Data Flow
1. **User Input**: JSON strings entered in left/right editors (App.tsx)
2. **Validation**: `validateAndParse()` checks JSON validity
3. **Processing**: Valid JSON passed to `semanticDiff()` (utils/semanticDiff.ts)
4. **Normalization**: 
   - `normalizeForDiff()` prepares objects for comparison
   - Property sorting and smart array alignment
5. **Diff Calculation**: jsondiffpatch computes differences
6. **Formatting**: Results formatted for display with `formatJSON()`
7. **State Update**: Comparison results stored in React state
8. **Display**: `DiffViewer` component renders side-by-side comparison

#### Key Integration Points

**App.tsx ↔ semanticDiff.ts**
- App calls `semanticDiff(leftParsed, rightParsed)`
- Receives `{ delta, left, right }` result
- Formats `left` and `right` for display
- Determines `hasDifferences` from `delta !== undefined`

**semanticDiff.ts ↔ jsondiffpatch**
- Creates customized differ via `createSemanticDiffer()`
- Provides custom `objectHash` function
- Configures array move detection
- Uses standard jsondiffpatch `diff()` method

**semanticDiff.ts ↔ jsonNormalizer.ts**
- Uses `sortObjectProperties()` for consistent ordering
- Leverages normalization utilities

#### State Management
- React state stores original inputs (`leftJson`, `rightJson`)
- Comparison results stored separately (`diffResult`)
- LocalStorage persistence for user convenience
- View mode toggling between edit and compare

#### UI Integration
- `DiffViewer` receives formatted JSON strings
- Uses Monaco Editor for syntax-highlighted diff view
- Shows "JSONs are equivalent!" message when no differences
- Provides reset functionality to return to edit mode

#### Analytics Integration
- Google Analytics events track user interactions:
  - Comparison initiation (`compare_click`)
  - Invalid JSON detection (`invalid_json`)
  - Comparison completion (`compare_completed`)
  - View mode changes (`back_to_edit`, `format_click`, `clear_click`)

### Extensibility Points

1. **Algorithm Configuration**: 
   - Modify `createSemanticDiffer()` to adjust jsondiffpatch options
   - Expose configuration parameters through a factory function

2. **UI Customization**:
   - Adjust DiffEditor options in `DiffViewer.tsx`
   - Modify styling through Tailwind CSS classes
   - Add new components in `src/components/`

3. **Service Extensions**:
   - Add new services in `src/services/` following existing patterns
   - Update analytics tracking as needed

4. **Build Process**:
   - Modify `vite.config.ts` for additional plugins
   - Update `scripts/` for custom build steps
   - Adjust ESLint/TypeScript configurations

### Data Flow Summary
```
User Input → Validation → Semantic Diff Processing → Result Formatting → UI Display
                    ↓
          LocalStorage Persistence
                    ↓
               Analytics Tracking
```