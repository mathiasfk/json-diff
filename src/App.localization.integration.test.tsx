import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { LocaleLayout } from './LocaleLayout';
import App from './App';

vi.mock('./components/JsonEditor', () => ({
  JsonEditor: ({ value, onChange, side, error }: { value: string; onChange: (value: string) => void; side: string; error?: string }) =>
    <><textarea aria-label={side} value={value} onChange={e => onChange(e.target.value)} />{error && <div role="alert">{error}</div>}</>,
}));
afterEach(() => { cleanup(); localStorage.clear(); });

it('retranslates a visible parser error after switching languages', async () => {
  localStorage.clear();
  await i18n.changeLanguage('en');
  render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/en']}><Routes><Route path="/:locale" element={<LocaleLayout><App /></LocaleLayout>} /></Routes></MemoryRouter></I18nextProvider>);
  fireEvent.change(screen.getByLabelText('left'), { target: { value: '{bad' } });
  fireEvent.click(screen.getByRole('button', { name: i18n.t('jsonEditor.formatLeft') }));
  expect(screen.getByRole('alert').textContent).toMatch(/^Invalid input:/);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pt' } });
  await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/^Entrada inválida:/));
  expect((screen.getByLabelText('left') as HTMLTextAreaElement).value).toBe('{bad');
  expect(screen.getByRole('alert').textContent).not.toContain('&#39;');
});
