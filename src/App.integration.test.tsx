import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./components/Header', () => ({ Header: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./components/JsonEditor', () => ({
  JsonEditor: ({ value, onChange, side, format, onFormatChange, error }: { value: string; onChange: (value: string) => void; side: string; format: string; onFormatChange: (value: string) => void; error?: string }) =>
    <><textarea aria-label={side} value={value} onChange={e => onChange(e.target.value)} /><select aria-label={`${side} format`} value={format} onChange={e => onFormatChange(e.target.value)}><option>json</option><option>jsonl</option><option>yaml</option></select>{error && <div role="alert">{side}: {error}</div>}</>,
}));
vi.mock('./components/DiffViewer', () => ({ DiffViewer: () => <div>Saved comparison</div> }));

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('comparison state and formatting', () => {
  it.each(['null', '{}', '{bad', '{"left":1}'])('recovers from invalid saved comparison %s', saved => {
    localStorage.setItem('jsonDiff.viewMode', 'compare');
    localStorage.setItem('jsonDiff.diffResult', saved);
    render(<App />);
    expect(screen.getByLabelText('left')).toBeTruthy();
    expect(localStorage.getItem('jsonDiff.viewMode')).toBe('edit');
  });

  it('restores a valid comparison without deleting saved input', async () => {
    localStorage.setItem('jsonDiff.left', '{"a":1}');
    localStorage.setItem('jsonDiff.viewMode', 'compare');
    localStorage.setItem('jsonDiff.diffResult', JSON.stringify({ left: '{}', right: '{}', language: 'json', hasDifferences: false }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('Saved comparison')).toBeTruthy());
    expect(localStorage.getItem('jsonDiff.left')).toBe('{"a":1}');
  });

  it.each(['false', '0', 'null'])('formats the valid JSON value %s', value => {
    render(<App />);
    const input = screen.getByLabelText('left') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: `  ${value}  ` } });
    fireEvent.click(screen.getByLabelText('jsonEditor.formatLeft'));
    expect(input.value).toBe(value);
  });
  it.each(['left', 'right'])('reports and clears errors for each format on the %s side', side => {
    render(<App />);
    const input = screen.getByLabelText(side) as HTMLTextAreaElement;
    const selector = screen.getByLabelText(`${side} format`);
    const button = screen.getByLabelText(side === 'left' ? 'jsonEditor.formatLeft' : 'jsonEditor.formatRight');
    for (const format of ['json', 'jsonl', 'yaml']) {
      fireEvent.change(selector, { target: { value: format } });
      fireEvent.change(input, { target: { value: format === 'yaml' ? 'a: [unterminated' : '{bad' } });
      fireEvent.click(button);
      expect(screen.getByRole('alert').textContent).toContain(side);
      expect(input.value).toBe(format === 'yaml' ? 'a: [unterminated' : '{bad');
      fireEvent.change(input, { target: { value: format === 'yaml' ? 'a: 1' : '{}' } });
      expect(screen.queryByRole('alert')).toBeNull();
    }
  });

  it('clears a stale error on format switch without affecting the other side', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('left'), { target: { value: '{bad' } });
    fireEvent.change(screen.getByLabelText('right'), { target: { value: '{bad' } });
    fireEvent.click(screen.getByLabelText('jsonEditor.formatLeft'));
    fireEvent.click(screen.getByLabelText('jsonEditor.formatRight'));
    fireEvent.change(screen.getByLabelText('left format'), { target: { value: 'yaml' } });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert').textContent).toContain('right');
  });

});
