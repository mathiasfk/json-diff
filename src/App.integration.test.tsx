import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./components/Header', () => ({ Header: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./components/JsonEditor', () => ({
  JsonEditor: ({ value, onChange, side }: { value: string; onChange: (value: string) => void; side: string }) =>
    <textarea aria-label={side} value={value} onChange={e => onChange(e.target.value)} />,
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
});
