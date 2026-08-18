/**
 * Format selector for multi-format diff input (JSON, JSONL, YAML).
 *
 * Responsibilities:
 *  - Enumerate the supported serialization formats.
 *  - Default to JSON when no format is supplied.
 *  - Parse (deserialize) a text payload of a given format into a
 *    JSON-compatible value that the diff engine (semanticDiff) can consume.
 *  - Serialize (stringify) a JSON-compatible value back into a chosen format.
 *  - Sniff a format from a filename extension.
 *
 * Design notes / constraints:
 *  - Zero dependencies: YAML is a tolerant indentation-based parser;
 *    JSON/JSONL use the platform.
 *  - UTF-8 in-memory: everything is handled as in-memory strings.
 *  - YAML honors a `flowStyle` option for output.
 *
 * The diff engine may later attach non-enumerable `__match_*` annotations to
 * parsed values. This module never sets or strips them; it only produces clean
 * JSON-compatible structures for deserialization and passes values through for
 * serialization, so downstream annotations are preserved by callers.
 */

export type Format = 'json' | 'jsonl' | 'yaml';

export const SUPPORTED_FORMATS: readonly Format[] = [
  'json',
  'jsonl',
  'yaml',
] as const;

export const DEFAULT_FORMAT: Format = 'json';

/** Options accepted by parse/serialize, per-format. All optional. */
export interface FormatOptions {
  /** YAML only: emit flow style (`{a: 1}`) instead of block style. */
  yamlFlowStyle?: boolean;
}

export class FormatError extends Error {
  readonly format: Format;
  /** 1-based line number when the error is line-specific (e.g. JSONL). */
  readonly line?: number;

  constructor(message: string, format: Format, line?: number) {
    super(message);
    this.name = 'FormatError';
    this.format = format;
    this.line = line;
  }
}

/** Normalize a possibly-uppercase or alias string into a known Format, defaulting to JSON. */
export function normalizeFormat(input?: string | Format | null): Format {
  if (!input) return DEFAULT_FORMAT;
  const lowered = input.toLowerCase();
  if ((SUPPORTED_FORMATS as readonly string[]).includes(lowered)) {
    return lowered as Format;
  }
  // Aliases
  if (lowered === 'jsonlines' || lowered === 'ndjson') return 'jsonl';
  return DEFAULT_FORMAT;
}

/** Sniff a format from a filename's extension; falls back to JSON. */
export function detectFormatFromFilename(filename: string): Format {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'json':
      return 'json';
    case 'jsonl':
    case 'ndjson':
      return 'jsonl';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return DEFAULT_FORMAT;
  }
}

// ---------------------------------------------------------------------------
// Deserialization
// ---------------------------------------------------------------------------

/** Parse text of the given format into a JSON-compatible value. */
export function parse(text: string, format: Format = DEFAULT_FORMAT): unknown {
  const fmt = normalizeFormat(format);
  switch (fmt) {
    case 'json':
      return parseJson(text);
    case 'jsonl':
      return parseJsonl(text);
    case 'yaml':
      return parseYaml(text);
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new FormatError(
      err instanceof Error ? err.message : 'Invalid JSON',
      'json',
    );
  }
}

function parseJsonl(text: string): unknown[] {
  const lines = text.split(/\r?\n/);
  const records: unknown[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue; // Skip blank lines
    try {
      records.push(JSON.parse(line));
    } catch (err) {
      throw new FormatError(
        err instanceof Error ? err.message : 'Invalid JSON on line',
        'jsonl',
        i + 1,
      );
    }
  }
  return records;
}

/** Tolerant YAML parser: supports block mappings, block sequences, and flow scalars. */
function parseYaml(text: string): unknown {
  // Empty document -> empty value (empty string to mirror JSON.parse('') failing semantics is avoided).
  if (text.trim() === '') return '';

  // The `---` document marker begins a document; strip it if present at start.
  let body = text.replace(/^---[ \t]*\r?\n?/, '');
  // Strip a trailing `...` document end marker.
  body = body.replace(/\.\.\.[ \t]*\r?\n?\s*$/, '');

  const rootIndent = leadingIndent(body);
  try {
    return parseYamlNode(body, rootIndent);
  } catch (err) {
    throw new FormatError(
      err instanceof Error ? err.message : 'Invalid YAML',
      'yaml',
    );
  }
}

function leadingIndent(text: string): number {
  const match = text.match(/^[ \t]*/);
  return match ? match[0].length : 0;
}

/** Parse a YAML node starting at `content` whose parent indentation is `parentIndent`. */
function parseYamlNode(content: string, parentIndent: number): unknown {
  const lines = splitLogicalLines(content);
  if (lines.length === 0) return '';

  const first = lines[0];

  // Flow collections at the top level
  if (first.rest.startsWith('[') || first.rest.startsWith('{')) {
    return parseYamlFlow(first.rest);
  }

  // Sequence: lines start with "- "
  if (first.rest.startsWith('- ')) {
    return parseYamlSequence(lines, parentIndent);
  }
  // Sequence with inline dash on first line "- item"
  if (first.rest === '-') {
    return parseYamlSequence(lines, parentIndent);
  }
  // Mapping
  if (first.rest.includes(':')) {
    return parseYamlMapping(lines, parentIndent);
  }

  // Scalar fallback (single value)
  if (lines.length === 1) {
    return parseYamlScalar(first.rest);
  }
  // Multiple scalar-ish lines with no structure: join them.
  return lines.map((l) => l.rest).join('\n');
}

interface LogicalLine {
  indent: number;
  rest: string;
}

/** Split into lines, dropping blank lines and full-line comments, recording indentation. */
function splitLogicalLines(content: string): LogicalLine[] {
  const out: LogicalLine[] = [];
  for (const raw of content.split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    if (raw.trim().startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;
    out.push({ indent, rest: raw.trim() });
  }
  return out;
}

function parseYamlScalar(token: string): unknown {
  if (token.startsWith('"') && token.endsWith('"') && token.length >= 2) {
    return token.slice(1, -1).replace(/\\"/g, '"');
  }
  if (token.startsWith("'") && token.endsWith("'") && token.length >= 2) {
    return token.slice(1, -1).replace(/''/g, "'");
  }
  if (token === 'true') return true;
  if (token === 'false') return false;
  if (token === 'null' || token === '~') return null;
  if (/^-?\d+$/.test(token)) return Number(token);
  if (/^-?\d+\.\d+$/.test(token)) return Number(token);
  return token;
}

function parseYamlMapping(lines: LogicalLine[], parentIndent: number): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < parentIndent) break;

    const colon = line.rest.indexOf(':');
    if (colon === -1) {
      i += 1;
      continue;
    }
    let key = line.rest.slice(0, colon).trim();
    const valuePart = line.rest.slice(colon + 1).trim();

    // Strip surrounding quotes from key if present
    if (
      (key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'"))
    ) {
      key = key.slice(1, -1);
    }

    if (valuePart === '') {
      // Nested block starting on the next line(s)
      const childLines = collectChildren(lines, i + 1, line.indent);
      if (childLines.length === 0) {
        result[key] = '';
      } else {
        result[key] = parseYamlNodeFromLines(childLines, line.indent, childLines[0].indent);
      }
      i = i + 1 + consumed(lines, i + 1, line.indent);
      continue;
    }

    if (valuePart.startsWith('[') || valuePart.startsWith('{')) {
      result[key] = parseYamlFlow(valuePart);
      i += 1;
      continue;
    }

    result[key] = parseYamlScalar(valuePart);
    i += 1;
  }
  return result;
}

function parseYamlSequence(lines: LogicalLine[], parentIndent: number): unknown[] {
  const result: unknown[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < parentIndent) break;
    if (!line.rest.startsWith('-')) break;

    const itemContent = line.rest.slice(1).trim(); // remove leading '-'

    if (itemContent === '') {
      // Nested block under the dash
      const childLines = collectChildren(lines, i + 1, line.indent);
      if (childLines.length === 0) {
        result.push('');
      } else {
        result.push(parseYamlNodeFromLines(childLines, line.indent, childLines[0].indent));
      }
      i = i + 1 + consumed(lines, i + 1, line.indent);
      continue;
    }

    if (itemContent.startsWith('{') || itemContent.startsWith('[')) {
      result.push(parseYamlFlow(itemContent));
      i += 1;
      continue;
    }

    // Inline "key: value" mapping within the sequence item
    if (itemContent.includes(':') && !itemContent.startsWith('"') && !itemContent.startsWith("'")) {
      // Treat the rest as a mapping block: this line is the first key, deeper lines continue it.
      const blockLines: LogicalLine[] = [{ indent: line.indent + 2, rest: itemContent }];
      const extra = collectChildren(lines, i + 1, line.indent);
      for (const e of extra) blockLines.push(e);
      result.push(parseYamlNodeFromLines(blockLines, line.indent, line.indent + 2));
      i = i + 1 + consumed(lines, i + 1, line.indent);
      continue;
    }

    result.push(parseYamlScalar(itemContent));
    i += 1;
  }
  return result;
}

/** Collect child lines that are indented deeper than `minIndent` (continuous run). */
function collectChildren(lines: LogicalLine[], start: number, minIndent: number): LogicalLine[] {
  const out: LogicalLine[] = [];
  for (let j = start; j < lines.length; j++) {
    if (lines[j].indent > minIndent) {
      out.push(lines[j]);
    } else {
      break;
    }
  }
  return out;
}

/** Number of lines consumed by children of the line at `start` (deeper than `minIndent`). */
function consumed(lines: LogicalLine[], start: number, minIndent: number): number {
  let count = 0;
  for (let j = start; j < lines.length; j++) {
    if (lines[j].indent > minIndent) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

/** Re-parse a collected set of logical lines as a node. */
function parseYamlNodeFromLines(lines: LogicalLine[], parentIndent: number, blockChildIndent: number): unknown {
  if (lines.length === 0) return '';
  const first = lines[0];
  if (first.rest.startsWith('- ')) {
    return parseYamlSequence(lines, parentIndent);
  }
  if (first.rest.includes(':')) {
    return parseYamlMapping(lines, parentIndent);
  }
  if (lines.length === 1) return parseYamlScalar(first.rest);
  void blockChildIndent;
  return lines.map((l) => l.rest).join('\n');
}

/** Parse YAML flow collection ([...] or {...}) — supports one level of nesting. */
function parseYamlFlow(token: string): unknown {
  const trimmed = token.trim();
  if (trimmed.startsWith('[')) {
    const inner = trimmed.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((s) => parseYamlScalar(s.trim()));
  }
  if (trimmed.startsWith('{')) {
    const inner = trimmed.slice(1, -1).trim();
    const obj: Record<string, unknown> = {};
    if (inner === '') return obj;
    for (const pair of inner.split(',')) {
      const colon = pair.indexOf(':');
      if (colon === -1) continue;
      const k = pair.slice(0, colon).trim().replace(/^["']|["']$/g, '');
      const v = pair.slice(colon + 1).trim();
      obj[k] = parseYamlScalar(v);
    }
    return obj;
  }
  return parseYamlScalar(trimmed);
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/** Serialize a JSON-compatible value into text of the given format. */
export function serialize(value: unknown, format: Format = DEFAULT_FORMAT, options: FormatOptions = {}): string {
  const fmt = normalizeFormat(format);
  switch (fmt) {
    case 'json':
      return JSON.stringify(value, null, 2);
    case 'jsonl':
      return serializeJsonl(value);
    case 'yaml':
      return serializeYaml(value, options);
  }
}

function serializeJsonl(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => JSON.stringify(item)).join('\n') + (value.length ? '\n' : '');
  }
  return JSON.stringify(value) + '\n';
}

/** Serialize a JSON-compatible value to YAML (block or flow style). */
function serializeYaml(value: unknown, options: FormatOptions = {}): string {
  const flow = options.yamlFlowStyle ?? false;
  return yamlStringify(value, 0, flow).replace(/\n$/, '');
}

function yamlStringify(value: unknown, indent: number, flow: boolean): string {
  if (Array.isArray(value)) {
    if (flow) {
      const inner = value.map((v) => yamlScalarOrFlow(v, true)).join(', ');
      return `[${inner}]\n`;
    }
    if (value.length === 0) return '[]\n';
    const pad = '  '.repeat(indent);
    return value.map((v) => `${pad}- ${yamlScalarOrFlow(v, false).replace(/^\s+/, '')}\n`).join('');
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (flow) {
      const inner = entries
        .map(([k, v]) => `${k}: ${yamlScalarOrFlow(v, true).trim()}`)
        .join(', ');
      return `{${inner}}\n`;
    }
    if (entries.length === 0) return '{}\n';
    const pad = '  '.repeat(indent);
    return entries
      .map(([k, v]) => {
        if (isPlainObject(v) || (Array.isArray(v) && v.length > 0)) {
          return `${pad}${k}:\n${yamlStringify(v, indent + 1, false)}`;
        }
        return `${pad}${k}: ${yamlScalarOrFlow(v, false).trim()}\n`;
      })
      .join('');
  }

  return `${yamlScalarValue(value)}\n`;
}

function yamlScalarOrFlow(value: unknown, flow: boolean): string {
  if (isPlainObject(value) || (Array.isArray(value))) {
    return yamlStringify(value, 0, flow).trimEnd();
  }
  return yamlScalarValue(value);
}

function yamlScalarValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  const str = String(value);
  if (str === '') return "''";
  // Quote if it could be misinterpreted as a special token or contains ':' followed by space.
  const needsQuote = /[:#[\]{}&*!|>'",%@`]/.test(str) || /^(true|false|null|~|-?\d+(\.\d+)?)$/.test(str);
  if (needsQuote) {
    return '"' + str.replace(/"/g, '\\"') + '"';
  }
  return str;
}

function isPlainObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
