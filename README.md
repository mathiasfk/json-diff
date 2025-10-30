# Semantic JSON Comparator

A web application for comparing JSON objects semantically with intelligent array matching and visual diff highlighting.

## Features

- **Semantic Comparison**: Compares JSON objects by meaning, not just structure
- **Smart Array Matching**: Automatically detects the best field to match array items (id, index, name, etc.)
- **Visual Diff**: Git-style diff visualization with additions/deletions highlighted
- **Property Sorting**: Automatically sorts object properties alphabetically
- **Format JSON**: Built-in JSON formatter for each input
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- jsondiffpatch (for semantic diffing)
- react-diff-viewer-continued (for visual diff)

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

1. Paste your JSON objects into the left and right text areas
2. Optionally use the "Format Left" or "Format Right" buttons to prettify your JSON
3. Click "Compare JSONs" to see the semantic diff
4. The diff view will highlight differences with green (additions) and red (deletions)
5. Click "Back to Edit" to return to the editing mode

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

