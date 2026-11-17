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
Legacy page components:

- `Faq.tsx`: Previous React FAQ view; public FAQ URLs now serve static HTML.

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
- `scripts/support-pages.js`: Static support pages and development middleware
- `scripts/build-pages.js`: Localized homepages, sitemap, compatibility alias, 404 and artifact validation

## Entry Points and CLI Interfaces

### Web Application Entry Point
The application is accessed through a web browser via `index.html` which:
1. Loads the compiled JavaScript bundle
2. Initializes the React application
3. Mounts the App component to the DOM root

### Development Scripts (package.json)
Available npm/pnpm scripts:
- `dev`: Start development server with hot module replacement
- `build`: TypeScript check + one Vite production build + localized HTML generation and validation
- `preview`: Preview production build locally
- `lint`: Run ESLint on TypeScript/TSX files
- `test`: Run Vitest unit tests
- `test:ui`: Run Vitest with UI interface
- `test:coverage`: Run tests with coverage reporting

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
  language: string;       // Monaco language for the result
  arrayComparison: 'semantic' | 'position'; // Mode used for the result
}
```

From `src/components/DiffViewer.tsx`:
```typescript
interface DiffViewerProps {
  oldValue: string;       // Original JSON string
  newValue: string;       // Modified JSON string
  onReset: () => void;    // Callback to return to edit mode
  hasDifferences: boolean;// Whether to show differences or "equivalent" message
  language: string;       // Monaco language for the result
  arrayComparison: 'semantic' | 'position'; // Mode used for the result
}
```

### Internal Data Structures (from semanticDiff.ts)

#### Normalized Objects
After processing through `semanticDiff()`:
- Objects with sorted properties
- Arrays aligned by content, key or similarity in semantic mode; array order preserved in positional mode
- In semantic mode, arrays may carry `__match_strategy` and `__match_field` annotations for matching

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
1. `pnpm build`:
   - TypeScript compilation (`tsc`)
   - Vite production build with minification
   - Generates and validates localized HTML and the production sitemap using `scripts/build-pages.js`
   - Outputs to `dist/` directory
2. `pnpm preview`: Serves built application locally for testing

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
4. Builds isolated previews with `PREVIEW_BASE`; see [publication and rollback](deploy-multilingue.md).

### Code Quality Checks
- ESLint with React hooks and refresh rules
- No warnings allowed (--max-warnings 0)
- TypeScript strict type checking
- Prettier formatting (implied by editor settings)

## Integration Guide

### How the Diff Algorithm Integrates with the System

#### Data Flow
1. **User Input**: JSON, JSONL or YAML entered in left/right editors (App.tsx)
2. **Validation**: Inputs are parsed according to their selected formats
3. **Processing**: Parsed values and the selected array mode are passed to `semanticDiff()`
4. **Normalization and diff**: Both modes sort object properties; semantic mode aligns arrays and uses jsondiffpatch, while positional mode compares indices recursively
5. **Formatting**: Results use the shared input format when supported, or JSON for mixed formats
6. **State Update**: Comparison results stored in React state
7. **Display**: `DiffViewer` component renders side-by-side comparison

#### Key Integration Points

**App.tsx ↔ semanticDiff.ts**
- App calls `semanticDiff(leftParsed, rightParsed, { arrayComparison })`
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
- The selected array mode is persisted separately and saved with each result
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
### Support pages

The Vite support-pages plugin (`scripts/support-pages.js`) emits localized, static HTML at `/<locale>/<page>/` for FAQ, how-it-works, privacy and contact. It serves the same pages in development and respects `PREVIEW_BASE` for internal links. FAQ answers come from the locale JSON; other support copy is in `src/content/support.json`, with shared navigation and example labels in `src/content/support-nav.json`. These documents load neither React nor Monaco. Legacy `#/<locale>/faq` links redirect to the static FAQ document.

### Multilingual routing and SEO

`src/content/site.json` defines the production origin, locales, native language names, Open Graph locale codes, support page names and public homepage copy. English uses `/`; the other tool versions use `/pt/`, `/es/` and `/zh/`. Support URLs retain the locale prefix, including English: `/en/faq/`, for example. The four homepages and sixteen support pages form the canonical URL set.

Vite compiles one shared set of JS, CSS and worker assets. `scripts/build-pages.js` reuses the compiled homepage template to generate localized HTML with visible introductory copy, navigation, a self-referencing canonical, reciprocal hreflang links, social metadata and structured data. React uses `createRoot` to replace the initial content; the same introductory copy remains visible after mounting. This is static generation of public content, not hydration of the editors.

`src/bootstrap-url.ts` is the first dependency of the application entry. It normalizes recognized legacy hash routes and `?lang=` URLs before i18next and analytics initialize. A valid localized pathname takes precedence over stored or browser preferences; `/` always uses English. `/en/` is a compatibility alias, not a canonical homepage. Migration preserves unrelated query parameters and ordinary anchors. Static hosting provides client-side redirects here, rather than HTTP 301 responses.

The tool uses `BrowserRouter` with the deployment base. `LocaleLayout` synchronizes pathname, language and document metadata without remounting `App`, so language navigation preserves editor inputs and comparison results even when storage is unavailable. Support pages remain separate static documents. Unknown paths rely on the host's actual 404 response rather than a catch-all SPA fallback.

The build validates generated documents, canonical and alternate URLs, local references and shared assets. Production gets a sitemap containing only canonical URLs, without synthetic modification dates. Preview documents use `noindex` and prefixed local links; previews do not publish a sitemap.

Keep the four small translation dictionaries in the shared bundle and the existing DiffViewer import lazy. When changing this pipeline, compare initial compressed JS/CSS and browser loading against the previous version, including external Monaco requests. Language changes within the tool should not reload Monaco. The publication workflow, preview preservation and rollback procedure are documented in [deploy-multilingue.md](deploy-multilingue.md).
