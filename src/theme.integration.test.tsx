import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './theme';

function ThemeControl() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme}</button>;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
});

describe('theme preference', () => {
  it('restores the preference, applies changes and persists them', () => {
    localStorage.setItem('jsonDiff.theme', 'light');
    const view = render(<ThemeProvider><ThemeControl /></ThemeProvider>);
    expect(document.documentElement.dataset.theme).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'light' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('jsonDiff.theme')).toBe('dark');
    view.unmount();
    render(<ThemeProvider><ThemeControl /></ThemeProvider>);
    expect(screen.getByRole('button', { name: 'dark' })).toBeTruthy();
  });

  it('continues to work when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<ThemeProvider><ThemeControl /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
