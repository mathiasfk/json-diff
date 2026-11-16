import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { DiffViewer } from './DiffViewer';

vi.mock('@monaco-editor/react', () => ({ DiffEditor: () => <div>Monaco diff</div> }));
afterEach(cleanup);

describe('DiffViewer array comparison mode', () => {
  it.each([
    ['semantic', 'Automatic alignment', 'No differences found after semantic normalization.'],
    ['position', 'Compare by position', 'No differences found when comparing array items by position.'],
  ] as const)('shows the %s mode and its equivalence message', async (mode, label, message) => {
    await i18n.changeLanguage('en');
    render(<I18nextProvider i18n={i18n}>
      <DiffViewer oldValue="[]" newValue="[]" hasDifferences={false} arrayComparison={mode} onReset={() => {}} />
    </I18nextProvider>);
    expect(screen.getByText(`Array comparison: ${label}`)).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('shows the mode when differences are present', async () => {
    await i18n.changeLanguage('en');
    render(<I18nextProvider i18n={i18n}>
      <DiffViewer oldValue="[1,2]" newValue="[2,1]" hasDifferences arrayComparison="position" onReset={() => {}} />
    </I18nextProvider>);
    expect(screen.getByText('Array comparison: Compare by position')).toBeTruthy();
    expect(screen.getByText('Monaco diff')).toBeTruthy();
  });
});
