import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { LanguageSelector } from './LanguageSelector';

/**
 * Integration test for locale switching. The LanguageSelector is presentational:
 * on selection it calls `onSelect(locale)`. The real consumer (Header) persists
 * the choice via i18n.changeLanguage and navigates to the locale-prefixed route.
 *
 * Here we drive a real <select> change event through React's synthetic event
 * system inside a jsdom DOM and assert that:
 *   (a) the chosen locale is reported to onSelect,
 *   (b) re-rendering with the new locale reflects it as selected, and
 *   (c) changing the locale actually switches the active i18n language.
 *
 * The test file name (*.integration.test.tsx) routes it to the jsdom project
 * defined in vitest.config.ts, so it always runs with a DOM environment.
 */

// In-memory storage used for test isolation. Falls back to the real
// window.localStorage / globalThis.localStorage when the runtime provides one
// (jsdom may not provision it under this Node build), otherwise keeps a
// module-scoped Map so beforeEach/afterEach.clear() never throws.
const memStore = new Map<string, string>();
const realLs: Storage | undefined =
  (globalThis.window && (globalThis.window.localStorage as Storage)) ||
  (globalThis.localStorage as Storage);
const ls: Storage =
  realLs ||
  ({
    getItem: (k: string) => (memStore.has(k) ? memStore.get(k)! : null),
    setItem: (k: string, v: string) => void memStore.set(k, String(v)),
    removeItem: (k: string) => void memStore.delete(k),
    clear: () => memStore.clear(),
    key: (i: number) => Array.from(memStore.keys())[i] ?? null,
    get length() {
      return memStore.size;
    },
  } as Storage);

beforeEach(() => {
  ls.clear();
});

afterEach(() => {
  cleanup();
  ls.clear();
  vi.restoreAllMocks();
});

describe('LanguageSelector — locale switching integration', () => {
  it('propagates the selected locale to onSelect', () => {
    const onSelect = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <LanguageSelector currentLocale="en" onSelect={onSelect} />
        </MemoryRouter>
      </I18nextProvider>,
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('en');

    fireEvent.change(select, { target: { value: 'pt' } });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('pt');
  });

  it('reflects the current locale as selected and switches i18n language', () => {
    const onSelect = vi.fn((lng: 'en' | 'pt' | 'zh' | 'es') => {
      void i18n.changeLanguage(lng);
    });

    const { rerender } = render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <LanguageSelector currentLocale="en" onSelect={onSelect} />
        </MemoryRouter>
      </I18nextProvider>,
    );

    const selectBefore = screen.getByRole('combobox') as HTMLSelectElement;
    expect(selectBefore.value).toBe('en');

    fireEvent.change(selectBefore, { target: { value: 'zh' } });

    // The parent normally re-renders with the synced locale; simulate that and
    // assert the selector now shows 中文 as selected and i18n switched.
    rerender(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <LanguageSelector currentLocale="zh" onSelect={onSelect} />
        </MemoryRouter>
      </I18nextProvider>,
    );

    const selectAfter = screen.getByRole('combobox') as HTMLSelectElement;
    expect(selectAfter.value).toBe('zh');
    expect(i18n.language).toBe('zh');
  });

  it('switching locale drives i18n.changeLanguage (the persistence trigger)', async () => {
    // The component is presentational and only calls onSelect. The real
    // consumer (Header) persists the choice by calling i18n.changeLanguage,
    // which is the signal the rest of the app (and the language detector)
    // rely on. We simulate that wiring and assert the language actually
    // changes.
    const onSelect = vi.fn((lng: 'en' | 'pt' | 'zh' | 'es') => {
      return i18n.changeLanguage(lng);
    });

    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <LanguageSelector currentLocale="en" onSelect={onSelect} />
        </MemoryRouter>
      </I18nextProvider>,
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'es' } });

    expect(onSelect).toHaveBeenCalledWith('es');
    // changeLanguage resolves asynchronously; flush microtasks.
    await new Promise((r) => setTimeout(r, 0));
    expect(i18n.language).toBe('es');
  });
});
