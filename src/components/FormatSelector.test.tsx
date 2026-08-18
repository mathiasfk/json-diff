import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormatSelector } from './FormatSelector';
import { SUPPORTED_FORMATS } from '../utils/formatSelector';

describe('FormatSelector', () => {
  it('renders one option per supported format', () => {
    const markup = renderToStaticMarkup(
      <FormatSelector value="json" onChange={() => {}} />,
    );
    for (const f of SUPPORTED_FORMATS) {
      expect(markup).toContain(`value="${f}"`);
      expect(markup).toContain(`>${f.toUpperCase()}</option>`);
    }
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
