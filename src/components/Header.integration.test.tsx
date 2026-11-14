import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { LocaleLayout } from '../LocaleLayout';
import { Header } from './Header';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function renderRoute(path: string) {
  render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/:locale" element={<LocaleLayout><Header /></LocaleLayout>} />
    <Route path="/:locale/faq" element={<LocaleLayout><Header homeLink showNav={false} /></LocaleLayout>} />
  </Routes></MemoryRouter></I18nextProvider>);
}

describe('localized navigation', () => {
  it('syncs the route, header, aria labels and document language on switch even with blocked storage', async () => {
    await i18n.changeLanguage('en');
    renderRoute('/en');
    expect(document.documentElement.lang).toBe('en');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pt' } });
    await waitFor(() => expect(document.documentElement.lang).toBe('pt'));
    expect(screen.getByText(i18n.t('header.subtitle'))).toBeTruthy();
    expect(screen.getByRole('navigation', { name: i18n.t('header.primaryNav') })).toBeTruthy();
    expect(screen.getByRole('link', { name: i18n.t('header.faq') }).getAttribute('href')).toBe('/pt/faq');
  });

  it('localizes the FAQ home link and initial route', async () => {
    renderRoute('/es/faq');
    await waitFor(() => expect(document.documentElement.lang).toBe('es'));
    expect(screen.getByRole('link', { name: i18n.t('header.homeAria') }).getAttribute('href')).toBe('/es');
  });

  it.each(['en', 'pt', 'es', 'zh'])('sets the initial document language for %s and provides translated keys', async locale => {
    renderRoute(`/${locale}`);
    await waitFor(() => expect(document.documentElement.lang).toBe(locale));
    for (const key of ['errors.empty', 'errors.invalid', 'errors.invalidDetail', 'faq.breadcrumbNav', 'editor.invalidJsonl']) {
      expect(i18n.exists(key, { lng: locale, fallbackLng: false })).toBe(true);
      expect(i18n.t(key, { lng: locale, message: 'detail', line: 1 })).not.toBe(key);
    }
  });

  it('interpolates parser details as text without double escaping', async () => {
    await i18n.changeLanguage('pt');
    const detail = `Unexpected '<tag>'`;
    const { container } = render(<div>{i18n.t('errors.invalidDetail', { message: detail })}</div>);
    expect(container.textContent).toContain(detail);
    expect(container.querySelector('tag')).toBeNull();
    expect(i18n.t('editor.invalidJsonl', { line: 1, message: detail })).toContain(detail);
  });
});
