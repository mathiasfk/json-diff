import type * as monaco from 'monaco-editor';

/**
 * Registers a dedicated `jsonl` language in Monaco for newline-delimited JSON.
 *
 * Goals (per task t_65a76295):
 *  - Single-line JSON syntax highlighting so colors match JSON, without pulling
 *    in the schema-validating JSON worker.
 *  - No formatter: `Format Document` / `Format on Paste` must NOT pretty-print
 *    multi-line JSON, which would silently break JSONL's one-value-per-line rule.
 *  - No auto-indent: `Enter` inserts a newline, it does not re-indent the value.
 *
 * The registration is idempotent so it can be called from every editor mount.
 */
let registered = false;

export function registerJsonlLanguage(monacoInstance: typeof monaco): void {
  if (registered) return;
  registered = true;

  monacoInstance.languages.register({
    id: 'jsonl',
    aliases: ['JSONL', 'jsonl', 'NDJSON'],
    extensions: ['.jsonl', '.ndjson'],
  });

  // JSON language configuration: each physical line is a top-level value with no
  // comment support. This yields correct bracket/auto-close behavior without any
  // formatter rules (no indentation rules => Enter just adds a newline).
  monacoInstance.languages.setLanguageConfiguration('jsonl', {
    brackets: [
      ['{', '}'],
      ['[', ']'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
    ],
  });

  // Minimal JSON-aware monarch tokenizer: strings, numbers, booleans, null, and
  // the structural brackets used in JSONL records. Keeps the `jsonl` language
  // independent of the schema-validating JSON worker.
  monacoInstance.languages.setMonarchTokensProvider('jsonl', {
    defaultToken: '',
    tokenizer: {
      root: [
        [/\{/, 'delimiter.curly'],
        [/\}/, 'delimiter.curly'],
        [/\[/, 'delimiter.square'],
        [/\]/, 'delimiter.square'],
        [/"/, { token: 'string.quote', next: '@string' }],
        [/-?\d+(\.\d+)?([eE][-+]?\d+)?/, 'number'],
        [/\b(true|false|null)\b/, 'keyword'],
        [/:/, 'delimiter'],
        [/,/, 'delimiter'],
        [/[ \t\r\n]+/, ''],
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, { token: 'string.quote', next: '@pop' }],
      ],
    },
  });
}
