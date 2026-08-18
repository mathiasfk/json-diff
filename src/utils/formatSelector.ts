/**
 * Format selector for multi-format diff input (JSON, JSONL, YAML, CSV, TSV).
 *
 * Responsibilities:
 *  - Enumerate the supported serialization formats.
 *  - Default to JSON when no format is supplied.
 *  - Parse (deserialize) a text payload of a given format into a
 *    JSON-compatible value that the diff engine (semanticDiff) can consume.
 *  - Serialize (stringify) a JSON-compatible value back into a chosen format.
 *  - Sniff a format from a filename extension.
 *
 * Design notes / constraints (per project feasibility decisions):
 *  - Zero dependencies: CSV/TSV parsing implements a minimal RFC 4180 reader;
 *    YAML is a tolerant indentation-based parser. JSON/JSONL use the platform.
 *  - Strings-only cell values: table formats (CSV/TSV) never guess numbers,
 *    booleans, or nulls — every cell stays a string, matching the diff tool's
 *    "compare text" use case and avoiding silent data coercion.
 *  - UTF-8 in-memory: everything is handled as in-memory strings.
 *  - CSV uses comma as the default delimiter; TSV uses a tab. Both accept a
 *    custom `delimiter` option. YAML honors a `flowStyle` option for output.
 *
 * The diff engine may later attach non-enumerable `__match_*` annotations to
 * parsed values. This module never sets or strips them; it only produces clean
 * JSON-compatible structures for deserialization and passes values through for
 * serialization, so downstream annotations are preserved by callers.
 */

export type Format = 'json' | 'jsonl' | 'yaml' | 'csv' | 'tsv';

export const SUPPORTED_FORMATS: readonly Format[] = [
  'json',
  'jsonl',
  'yaml',
  'csv',
  'tsv',
] as const;

export const DEFAULT_FORMAT: Format = 'json';

/** Options accepted by parse/serialize, per-format. All optional. */
export interface FormatOptions {
  /** CSV/TSV only: field delimiter. Defaults to ',' (csv) or '\t' (tsv). */
  delimiter?: string;
  /** YAML only: emit flow style (`{a: 1}`) instead of block style. */
  yamlFlowStyle?: boolean;
  /** CSV/TSV only: treat the first row as a header and return records keyed by header. */
  firstRowIsHeader?: boolean; // (reserved for callers; parser exposes header via TableModel)
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

/** A parsed table (CSV/TSV): header row + string-only record rows. */
export interface TableModel {
  header: string[];
  rows: string[][];
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
    case 'csv':
      return 'csv';
    case 'tsv':
    case 'tab':
      return 'tsv';
    default:
      return DEFAULT_FORMAT;
  }
}

// ---------------------------------------------------------------------------
// Content-based format detection (paste / text sniffing)
// ---------------------------------------------------------------------------

/**
 * Inspect raw text and guess which supported format it most likely is.
 *
 * Detection order matters: JSONL and CSV/TSV only "smell" right when every
 * data line parses, so JSON is attempted first (the strict, cheap check),
 * then JSONL (one JSON value per line), then XML, then the delimiter-based
 * table formats (CSV / TSV), then YAML. Anything that matches nothing is
 * reported as plain text.
 *
 * Note: the tool only diffs the 5 serialization formats, so `xml`/`plaintext`
 * are returned as `'json'` (the default) by callers that need a `Format`. The
 * dedicated `detectInputFormat` return type (`DetectedFormat`) is broader so
 * the UI can surface "this isn't a supported diff format" without guessing.
 */
export type DetectedFormat = Format | 'xml' | 'plaintext';

/** Result of {@link detectInputFormat}: the guessed format plus a confidence flag. */
export interface DetectResult {
  format: DetectedFormat;
  /** `true` when the text parsed cleanly as the returned format. */
  confident: boolean;
}

/** Split text into non-empty lines, tolerating CRLF and trailing newlines. */
function nonEmptyLines(text: string): string[] {
  return text.split(/\r?\n/).filter((line) => line.trim() !== '');
}

/** Heuristic: does the line look like a single complete JSON value? */
function isJsonLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  const opens = first === '{' || first === '[';
  const closes = last === '}' || last === ']';
  // A bare quoted string / number is valid JSON too, but for sniffing we
  // restrict to container/structural values to avoid false positives.
  if (opens && closes) return true;
  return false;
}

function looksLikeCsvOrTsv(text: string, delimiter: string): boolean {
  // splitCsvRows returns an array of rows (each a field array). Drop any
  // fully-blank rows produced by trailing newlines before inspecting.
  const rows = splitCsvRows(text, delimiter).filter(
    (row) => !(row.length === 1 && row[0] === ''),
  );
  // Require at least two rows with the same column count and ≥2 columns each;
  // a single "a,b" row is too weak a signal (could be arbitrary comma prose).
  if (rows.length < 2) return false;
  let columnCount = -1;
  for (const row of rows) {
    if (row.length < 2) return false;
    if (columnCount === -1) columnCount = row.length;
    else if (row.length !== columnCount) return false;
  }
  return true;
}

/** Detect the format of pasted/raw text. Falls back to `'plaintext'`. */
export function detectInputFormat(text: string): DetectResult {
  if (typeof text !== 'string') {
    return { format: 'plaintext', confident: false };
  }
  const trimmed = text.trim();
  if (trimmed === '') {
    return { format: 'plaintext', confident: false };
  }

  // JSON: a single JSON document (object/array/value).
  if (isJsonLine(trimmed)) {
    try {
      JSON.parse(trimmed);
      return { format: 'json', confident: true };
    } catch {
      // Not a single JSON value — fall through to line-based checks.
    }
  }

  // JSONL: every non-empty line is a JSON value.
  const lines = nonEmptyLines(text);
  if (lines.length >= 1) {
    let allJson = true;
    for (const line of lines) {
      if (!isJsonLine(line)) {
        allJson = false;
        break;
      }
      try {
        JSON.parse(line);
      } catch {
        allJson = false;
        break;
      }
    }
    if (allJson) {
      return { format: 'jsonl', confident: true };
    }
  }

  // XML: a document or fragment wrapped in tags (also tolerates a leading
  // `<?xml ...?>` declaration). Require a matching closing tag for confidence.
  if (
    /^\s*<\?xml\b/.test(trimmed) ||
    (/^\s*<([a-zA-Z_][\w.-]*)(\s[^>]*)?>/.test(trimmed) && trimmed.includes('</'))
  ) {
    return { format: 'xml', confident: true };
  }

  // CSV / TSV: delimiter-separated tables with consistent columns.
  if (looksLikeCsvOrTsv(text, ',')) {
    return { format: 'csv', confident: true };
  }
  if (looksLikeCsvOrTsv(text, '\t')) {
    return { format: 'tsv', confident: true };
  }

  // YAML: block mapping (lines of "key: value") or block sequence ("- item").
  if (/^(?:[ \t]*[\w.$-]+[ \t]*:[ \t]*|\s*-[ \t]+)/.test(trimmed)) {
    try {
      parseYaml(text);
      return { format: 'yaml', confident: true };
    } catch {
      // Parsing failed; treat as plain text below.
    }
  }

  return { format: 'plaintext', confident: false };
}

// ---------------------------------------------------------------------------
// Deserialization
// ---------------------------------------------------------------------------

/** Parse text of the given format into a JSON-compatible value. */
export function parse(text: string, format: Format = DEFAULT_FORMAT, options: FormatOptions = {}): unknown {
  const fmt = normalizeFormat(format);
  switch (fmt) {
    case 'json':
      return parseJson(text);
    case 'jsonl':
      return parseJsonl(text);
    case 'yaml':
      return parseYaml(text);
    case 'csv':
      return parseCsv(text, options);
    case 'tsv':
      return parseCsv(text, { ...options, delimiter: options.delimiter ?? '\t' });
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

/** RFC 4180-style CSV/TSV reader: handles quotes, escaped quotes, embedded delimiters and newlines. */
function parseCsv(text: string, options: FormatOptions = {}): TableModel {
  const delimiter = options.delimiter ?? ',';
  const rows = splitCsvRows(text, delimiter);
  const header = rows.length > 0 ? rows[0] : [];
  const body = rows.slice(1);
  return { header, rows: body };
}

/** Split raw CSV/TSV text into rows of fields, honoring quoting rules. */
function splitCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === delimiter) {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }

    if (char === '\r') {
      // Handle CRLF: only treat as row end, skip the following \n.
      row.push(field);
      rows.push(row);
      field = '';
      row = [];
      i += 1;
      if (text[i] === '\n') i += 1;
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      field = '';
      row = [];
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // Flush trailing field/row (file not ending in newline).
  row.push(field);
  // Avoid pushing an empty phantom row when the text ended cleanly on a newline.
  if (!(field === '' && row.length === 1 && rows.length > 0)) {
    rows.push(row);
  }

  return rows;
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
    case 'csv':
      return serializeCsv(value, options);
    case 'tsv':
      return serializeCsv(value, { ...options, delimiter: options.delimiter ?? '\t' });
  }
}

function serializeJsonl(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => JSON.stringify(item)).join('\n') + (value.length ? '\n' : '');
  }
  return JSON.stringify(value) + '\n';
}

function serializeCsv(value: unknown, options: FormatOptions = {}): string {
  const delimiter = options.delimiter ?? ',';
  const model = valueToTable(value);
  const allRows = model.header.length > 0 ? [model.header, ...model.rows] : model.rows;
  return allRows.map((row) => row.map((cell) => quoteCsvCell(String(cell ?? ''), delimiter)).join(delimiter)).join('\n');
}

/** Render a JSON-compatible value as a header + string rows. */
function valueToTable(value: unknown): TableModel {
  if (Array.isArray(value)) {
    if (value.length === 0) return { header: [], rows: [] };
    const first = value[0];
    if (isPlainObject(first)) {
      const header = Object.keys(first as Record<string, unknown>);
      const rows = (value as Record<string, unknown>[]).map((obj) =>
        header.map((h) => stringifyCell((obj as Record<string, unknown>)[h])),
      );
      return { header, rows };
    }
    // Array of primitives
    return { header: [], rows: value.map((v) => [stringifyCell(v)]) };
  }
  if (isPlainObject(value)) {
    const obj = value as Record<string, unknown>;
    const header = Object.keys(obj);
    const rows = [header.map((h) => stringifyCell(obj[h]))];
    return { header, rows };
  }
  // Scalar
  return { header: [], rows: [[stringifyCell(value)]] };
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function quoteCsvCell(cell: string, delimiter: string): string {
  const needsQuote = cell.includes('"') || cell.includes('\n') || cell.includes('\r') || cell.includes(delimiter);
  if (needsQuote) {
    return '"' + cell.replace(/"/g, '""') + '"';
  }
  return cell;
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
  const needsQuote = /[:#[\]{}&*!|>'"%@`,]/.test(str) || /^(true|false|null|~|-?\d+(\.\d+)?)$/.test(str);
  if (needsQuote) {
    return '"' + str.replace(/"/g, '\\"') + '"';
  }
  return str;
}

function isPlainObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
