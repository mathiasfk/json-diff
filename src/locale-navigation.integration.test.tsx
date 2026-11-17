import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import i18n from './i18n';
import { LocaleLayout } from './LocaleLayout';
import App from './App';

vi.mock('./components/JsonEditor', () => ({
  JsonEditor: ({ value, onChange, side, format, onFormatChange }: { value: string; onChange: (value: string) => void; side: string; format: string; onFormatChange: (value: string) => void }) => <>
    <textarea aria-label={side} value={value} onChange={e => onChange(e.target.value)} />
    <select aria-label={`${side}-format`} value={format} onChange={e => onFormatChange(e.target.value)}><option value="json">JSON</option><option value="yaml">YAML</option><option value="jsonl">JSONL</option></select>
  </>,
}));
vi.mock('./components/DiffViewer', () => ({ DiffViewer: ({ onReset }: { onReset: () => void }) => <div>comparison result<button onClick={onReset}>edit inputs</button></div> }));
vi.mock('./services/analytics', () => ({ gtag: vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState(null, '', '/'); });

it('preserves in-memory inputs, formats and comparison across language navigation and history when storage is blocked', async () => {
  window.history.replaceState(null, '', '/');
  await i18n.changeLanguage('en');
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  render(<BrowserRouter><LocaleLayout><App /></LocaleLayout></BrowserRouter>);
  fireEvent.change(screen.getByLabelText('left'), { target: { value: 'a: 1' } });
  fireEvent.change(screen.getByLabelText('right'), { target: { value: 'a: 2' } });
  fireEvent.change(screen.getByLabelText('left-format'), { target: { value: 'yaml' } });
  fireEvent.change(screen.getByLabelText('right-format'), { target: { value: 'yaml' } });
  fireEvent.change(screen.getByLabelText(i18n.t('app.language')), { target: { value: 'pt' } });
  await waitFor(() => expect(window.location.pathname).toBe('/pt/'));
  expect((screen.getByLabelText('left') as HTMLTextAreaElement).value).toBe('a: 1');
  expect((screen.getByLabelText('left-format') as HTMLSelectElement).value).toBe('yaml');
  fireEvent.change(screen.getByLabelText(i18n.t('app.language')), { target: { value: 'en' } });
  await waitFor(() => expect(window.location.pathname).toBe('/'));
  expect((screen.getByLabelText('right') as HTMLTextAreaElement).value).toBe('a: 2');
  expect((screen.getByLabelText('right-format') as HTMLSelectElement).value).toBe('yaml');
  fireEvent.click(screen.getByLabelText(i18n.t('jsonEditor.compare')));
  await screen.findByText('comparison result');
  fireEvent.change(screen.getByLabelText(i18n.t('app.language')), { target: { value: 'pt' } });
  await waitFor(() => expect(window.location.pathname).toBe('/pt/'));
  expect(screen.getByText('comparison result')).toBeTruthy();
  window.history.back();
  await waitFor(() => expect(window.location.pathname).toBe('/'));
  expect(screen.getByText('comparison result')).toBeTruthy();
  window.history.forward();
  await waitFor(() => expect(window.location.pathname).toBe('/pt/'));
  expect(screen.getByText('comparison result')).toBeTruthy();
  fireEvent.click(screen.getByText('edit inputs'));
  expect((screen.getByLabelText('left') as HTMLTextAreaElement).value).toBe('a: 1');
  expect((screen.getByLabelText('left-format') as HTMLSelectElement).value).toBe('yaml');
});
