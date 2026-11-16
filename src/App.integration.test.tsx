import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { gtag } from './services/analytics';

vi.mock('./services/analytics', () => ({ gtag: vi.fn() }));

vi.mock('./components/Header', () => ({ Header: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./components/JsonEditor', () => ({
  JsonEditor: ({ value, onChange, side, format, onFormatChange, error }: { value: string; onChange: (value: string) => void; side: string; format: string; onFormatChange: (value: string) => void; error?: string }) =>
    <><textarea aria-label={side} value={value} onChange={e => onChange(e.target.value)} /><select aria-label={`${side} format`} value={format} onChange={e => onFormatChange(e.target.value)}><option>json</option><option>jsonl</option><option>yaml</option></select>{error && <div role="alert">{side}: {error}</div>}</>,
}));
vi.mock('./components/DiffViewer', () => ({ DiffViewer: ({ arrayComparison, hasDifferences, onReset }: { arrayComparison: string; hasDifferences: boolean; onReset: () => void }) => <div>Saved comparison <span>{arrayComparison} {String(hasDifferences)}</span><button onClick={onReset}>Back</button></div> }));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('comparison state and formatting', () => {
  it('tracks genuine mode changes with the previous and selected modes', () => {
    render(<App />);
    expect(gtag).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: 'arrayComparison.position' }));
    expect(gtag).toHaveBeenLastCalledWith('event', 'array_comparison_change', {
      array_comparison: 'position', previous_array_comparison: 'semantic',
    });
    fireEvent.click(screen.getByRole('radio', { name: 'arrayComparison.position' }));
    expect(gtag).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('radio', { name: 'arrayComparison.semantic' }));
    expect(gtag).toHaveBeenLastCalledWith('event', 'array_comparison_change', {
      array_comparison: 'semantic', previous_array_comparison: 'position',
    });
    expect(gtag).toHaveBeenCalledTimes(2);
  });

  it.each(['semantic', 'position'])('tracks the %s mode on compare, including restored preferences', async mode => {
    localStorage.setItem('jsonDiff.arrayComparison', mode);
    render(<App />);
    expect(gtag).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('left'), { target: { value: '[1,2]' } });
    fireEvent.change(screen.getByLabelText('right'), { target: { value: '[2,1]' } });
    fireEvent.click(screen.getByLabelText('jsonEditor.compare'));
    await waitFor(() => expect(screen.getByText('Saved comparison')).toBeTruthy());
    expect(gtag).toHaveBeenCalledWith('event', 'compare_click', {
      left_chars: 5, right_chars: 5, array_comparison: mode,
    });
    expect(gtag).toHaveBeenCalledWith('event', 'compare_completed', {
      left_chars: 5, right_chars: 5, left_format: 'json', right_format: 'json',
      has_differences: mode === 'position' ? 1 : 0, array_comparison: mode,
    });
  });

  it('tracks the selected mode on an invalid comparison without recording completion', () => {
    localStorage.setItem('jsonDiff.arrayComparison', 'position');
    render(<App />);
    fireEvent.change(screen.getByLabelText('left'), { target: { value: '{bad' } });
    fireEvent.change(screen.getByLabelText('right'), { target: { value: '{}' } });
    fireEvent.click(screen.getByLabelText('jsonEditor.compare'));
    expect(gtag).toHaveBeenCalledWith('event', 'compare_click', {
      left_chars: 4, right_chars: 2, array_comparison: 'position',
    });
    expect(vi.mocked(gtag).mock.calls.some(call => call[1] === 'compare_completed')).toBe(false);
  });

  it('compares the same reorder in both modes', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('left'), { target: { value: '[1,2]' } });
    fireEvent.change(screen.getByLabelText('right'), { target: { value: '[2,1]' } });
    fireEvent.click(screen.getByLabelText('jsonEditor.compare'));
    await waitFor(() => expect(screen.getByText('semantic false')).toBeTruthy());
    fireEvent.click(screen.getByText('Back'));
    fireEvent.click(screen.getByRole('radio', { name: 'arrayComparison.position' }));
    fireEvent.click(screen.getByLabelText('jsonEditor.compare'));
    await waitFor(() => expect(screen.getByText('position true')).toBeTruthy());
  });

  it('preserves nested array order when formatting JSON by position', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: 'arrayComparison.position' }));
    const input = screen.getByLabelText('left') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '{"z":[3,1,{"a":[2,1]}],"a":1}' } });
    fireEvent.click(screen.getByLabelText('jsonEditor.formatLeft'));
    expect(JSON.parse(input.value)).toEqual({ a: 1, z: [3, 1, { a: [2, 1] }] });
    expect(input.value.indexOf('"a"')).toBeLessThan(input.value.indexOf('"z"'));
  });

  it.each([
    ['semantic', { arrayComparison: 'position' }, 'position false'],
    ['position', {}, 'semantic false'],
  ])('restores the saved result mode independently of preference %s', async (preference, savedMode, expected) => {
    localStorage.setItem('jsonDiff.arrayComparison', preference);
    localStorage.setItem('jsonDiff.viewMode', 'compare');
    localStorage.setItem('jsonDiff.diffResult', JSON.stringify({ left: '[]', right: '[]', language: 'json', hasDifferences: false, ...savedMode }));
    render(<App />);
    await waitFor(() => expect(screen.getByText(expected)).toBeTruthy());
    fireEvent.click(screen.getByText('Back'));
    expect((screen.getByRole('radio', { name: `arrayComparison.${preference}` }) as HTMLInputElement).checked).toBe(true);
  });

  it('persists the selected mode and associates it with a JSONL result', async () => {
    render(<App />);
    expect((screen.getByRole('radio', { name: /arrayComparison.semantic/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: /arrayComparison.position/ }));
    expect(localStorage.getItem('jsonDiff.arrayComparison')).toBe('position');
    for (const side of ['left', 'right']) fireEvent.change(screen.getByLabelText(`${side} format`), { target: { value: 'jsonl' } });
    fireEvent.change(screen.getByLabelText('left'), { target: { value: '1\n2' } });
    fireEvent.change(screen.getByLabelText('right'), { target: { value: '2\n1' } });
    fireEvent.click(screen.getByLabelText('jsonEditor.compare'));
    await waitFor(() => expect(screen.getByText('position true')).toBeTruthy());
    fireEvent.click(screen.getByText('Back'));
    expect((screen.getByRole('radio', { name: /arrayComparison.position/ }) as HTMLInputElement).checked).toBe(true);
    cleanup();
    render(<App />);
    expect((screen.getByRole('radio', { name: /arrayComparison.position/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('restores old results as automatic alignment and rejects invalid preferences', async () => {
    localStorage.setItem('jsonDiff.arrayComparison', 'invalid');
    localStorage.setItem('jsonDiff.viewMode', 'compare');
    localStorage.setItem('jsonDiff.diffResult', JSON.stringify({ left: '[]', right: '[]', language: 'json', hasDifferences: false }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('semantic false')).toBeTruthy());
    fireEvent.click(screen.getByText('Back'));
    expect((screen.getByRole('radio', { name: /arrayComparison.semantic/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('loads a comparable example and resets previously selected formats', async () => {
    localStorage.setItem('jsonDiff.leftFormat', 'yaml');
    localStorage.setItem('jsonDiff.rightFormat', 'jsonl');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'app.loadExample' }));
    const left = JSON.parse((screen.getByLabelText('left') as HTMLTextAreaElement).value);
    const right = JSON.parse((screen.getByLabelText('right') as HTMLTextAreaElement).value);
    expect(left.members[0]).toMatchObject({ id: 1, role: 'developer' });
    expect(right.members[1]).toMatchObject({ id: 1, role: 'lead' });
    expect((screen.getByLabelText('left format') as HTMLSelectElement).value).toBe('json');
    expect((screen.getByLabelText('right format') as HTMLSelectElement).value).toBe('json');
    expect(screen.getByRole('button', { name: 'app.loadExample' })).toBeTruthy();
    fireEvent.click(screen.getByLabelText('jsonEditor.compare'));
    await waitFor(() => expect(screen.getByText('Saved comparison')).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(['left', 'right'])('preserves saved user content on the %s side', side => {
    localStorage.setItem(`jsonDiff.${side}`, '{"user":true}');
    render(<App />);
    expect(screen.getByRole('button', { name: 'app.loadExample' })).toBeTruthy();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'app.loadExample' }));
    expect(confirm).toHaveBeenCalled();
    expect((screen.getByLabelText(side) as HTMLTextAreaElement).value).toBe('{"user":true}');
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'app.loadExample' }));
    expect(JSON.parse((screen.getByLabelText(side) as HTMLTextAreaElement).value)).toHaveProperty('members');
  });

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
