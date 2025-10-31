# Semantic JSON Comparator

A web application for comparing JSON objects semantically with intelligent array matching and visual diff highlighting.

## Features

- **Semantic Comparison**: Compares JSON objects by meaning, not just structure
- **Smart Array Matching**: Automatically detects the best field to match array items (id, index, name, etc.)
- **Visual Diff**: Git-style diff visualization with additions/deletions highlighted using Monaco Editor
- **Monaco Editor Integration**: Professional code editor (same as VSCode) with syntax highlighting and consistent visual experience
- **Property Sorting**: Automatically sorts object properties alphabetically
- **Format JSON**: Built-in JSON formatter for each input with format-on-paste and format-on-type
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- jsondiffpatch (for semantic diffing)
- Monaco Editor / @monaco-editor/react (for code editing and diff visualization - the same editor used by VSCode)

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

Open your browser to the URL shown in the terminal (typically http://localhost:5173)

## Build

```bash
pnpm build
```

## Usage

1. Paste your JSON objects into the left and right Monaco editors (with syntax highlighting)
2. The editor automatically validates JSON syntax and highlights errors in real-time
3. Optionally use the "Format Left" or "Format Right" buttons to prettify your JSON
4. Click "Compare JSONs" to see the semantic diff in side-by-side view
5. The diff view uses Monaco Editor's diff mode with visual highlighting of additions (green) and deletions (red)
6. Click "Back to Edit" to return to the editing mode

## How It Works

### Semantic Comparison Algorithm

1. **Object Normalization**: All object properties are sorted alphabetically
2. **Array Matching**: The system automatically detects the best way to match array items:
   - Priority fields: `id`, `index`, `name`, `key`, `uuid`, `_id`
   - Falls back to similarity-based matching if no unique field is found
3. **Intelligent Diff**: Uses jsondiffpatch with custom array matching to minimize noise and show meaningful differences

### Example

Given these two JSON objects:

**Left:**
```json
{
  "name": "John",
  "hobbies": [
    {"id": 1, "name": "Reading"},
    {"id": 2, "name": "Traveling"}
  ]
}
```

**Right:**
```json
{
  "hobbies": [
    {"id": 2, "name": "Traveling"},
    {"id": 1, "name": "Reading"}
  ],
  "name": "John"
}
```

The comparator will recognize that:
- The properties are just in different order (no diff)
- The hobbies array has the same items, just reordered based on the `id` field (no diff)

Result: **No differences** (semantically identical)

## Test Scenarios (JSON fixtures)

- Place scenarios under `test-data/<scenario>/` with these files:
  - `left.json`: base JSON
  - `right.json`: JSON to compare
  - `expected.json`: expected delta; use `null` when there should be no differences. If omitted, the test only asserts successful execution.

- Automated test runner: `src/utils/semanticDiff.scenarios.test.js` iterates all subfolders in `test-data/` and runs comparisons automatically.

