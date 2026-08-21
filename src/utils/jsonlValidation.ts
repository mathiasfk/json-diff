/**
 * Pure validation helpers for JSONL (newline-delimited JSON) content.
 *
 * JSONL requires one self-contained JSON value per physical line. A pretty-printed
 * object spans multiple lines and is therefore NOT valid JSONL — each of its lines
 * is invalid JSON on its own. These helpers let the editor flag offending lines
 * without depending on Monaco, so the rule is unit-testable in the node test env.
 */

export interface JsonlLineError {
  /** 1-based line number in the source text. */
  lineNumber: number;
  /** Message from the underlying JSON.parse failure, or a spec note. */
  message: string;
}

/**
 * Validate that every non-blank physical line is a single, complete JSON value.
 * Blank lines are allowed (and skipped) because JSONL permits empty separators
 * between records. Returns one entry per invalid line, in source order.
 */
export function validateJsonlLines(text: string): JsonlLineError[] {
  const errors: JsonlLineError[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (line.trim() === '') return; // blank lines between records are valid

    try {
      JSON.parse(line);
    } catch (err) {
      errors.push({
        lineNumber: index + 1,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return errors;
}

/** True when the whole text is valid JSONL (every non-blank line is valid JSON). */
export function isTextValidJsonl(text: string): boolean {
  return validateJsonlLines(text).length === 0;
}
