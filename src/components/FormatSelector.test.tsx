import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormatSelector } from './FormatSelector';

// Formats the UI selector is expected to expose: JSON, JSONL and YAML.
const EXPECTED_UI_FORMATS = ['json', 'jsonl', 'yaml'] as const;

describe('FormatSelector', () => {
  it('renders one option per supported UI format', () => {
    const markup = renderToStaticMarkup(
      <FormatSelector value="json" onChange={() => {}} />,
    );
    for (const f of EXPECTED_UI_FORMATS) {
      expect(markup).toContain(`value="${f}"`);
      expect(markup).toContain(`>${f.toUpperCase()}</option>`);
    }
  });

  it('renders exactly the supported UI formats', () => {
    const markup = renderToStaticMarkup(
      <FormatSelector value="json" onChange={() => {}} />,
    );
    const optionCount = (markup.match(/<option/g) || []).length;
    expect(optionCount).toBe(EXPECTED_UI_FORMATS.length);
  });

  it('marks the selected format as the default option', () => {
    const markup = renderToStaticMarkup(
      <FormatSelector value="yaml" onChange={() => {}} />,
    );
    // The selected value should appear as the "selected" option.
    expect(markup).toContain('<option value="yaml" selected="">YAML</option>');
  });

  it('renders a visible label when provided', () => {
    const markup = renderToStaticMarkup(
      <FormatSelector value="json" onChange={() => {}} label="Format" />,
    );
    expect(markup).toContain('>Format</span>');
  });
});
