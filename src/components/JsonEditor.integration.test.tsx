import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JsonEditor } from './JsonEditor';
import type { Format } from '../utils/formatSelector';

const mocks = vi.hoisted(() => ({ mounts: [] as Array<(editor: unknown, monaco: unknown) => void> }));
vi.mock('@monaco-editor/react', () => ({ default: ({ onMount }: { onMount: (editor: unknown, monaco: unknown) => void }) => { mocks.mounts.push(onMount); return null; } }));
vi.mock('./jsonlLanguage', () => ({ registerJsonlLanguage: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, options?: { line: number }) => `${key}:${options?.line ?? ''}` }) }));

afterEach(() => { cleanup(); mocks.mounts.length = 0; });

function setupModel() {
  const model = { getLineMaxColumn: () => 10, getLineCount: () => 1, isDisposed: () => false };
  const editor = { getModel: () => model, onDidPaste: () => ({ dispose: vi.fn() }), onDidChangeModel: () => ({ dispose: vi.fn() }), updateOptions: vi.fn() };
  return { model, editor };
}
function component(format: Format, value = '{bad', error = '') {
  return <JsonEditor label="Input" side="left" format={format} value={value} error={error} onChange={() => {}} onFormatChange={() => {}} />;
}

describe('Monaco validation', () => {
  it.each([['json', 'jsonl'], ['jsonl', 'json'], ['json', 'yaml'], ['yaml', 'json']] as const)('keeps JSON diagnostics enabled when %s and %s mount', (first, second) => {
    const diagnostics = vi.fn();
    const markers = vi.fn();
    const monaco = { json: { jsonDefaults: { setDiagnosticsOptions: diagnostics } }, editor: { setModelMarkers: markers }, MarkerSeverity: { Error: 8 } };
    render(<>{component(first)}{component(second)}</>);
    const a = setupModel(); const b = setupModel();
    act(() => { mocks.mounts[0](a.editor, monaco); mocks.mounts[1](b.editor, monaco); });
    expect(diagnostics).toHaveBeenCalledTimes(2);
    expect(diagnostics.mock.calls.every(([options]) => options.validate === true)).toBe(true);
    for (const [format, model] of [[first, a.model], [second, b.model]] as const) {
      expect(markers).toHaveBeenCalledWith(model, 'jsonl-validation', format === 'jsonl' ? [expect.objectContaining({ message: 'editor.invalidJsonl:1' })] : []);
    }
  });

  it('validates on delayed mount and clears only custom markers through format and content changes', () => {
    const diagnostics = vi.fn(); const markers = vi.fn();
    const monaco = { json: { jsonDefaults: { setDiagnosticsOptions: diagnostics } }, editor: { setModelMarkers: markers }, MarkerSeverity: { Error: 8 } };
    const { editor, model } = setupModel();
    const view = render(component('jsonl'));
    act(() => mocks.mounts[0](editor, monaco));
    expect(markers).toHaveBeenLastCalledWith(model, 'json-validation', []);
    expect(markers).toHaveBeenCalledWith(model, 'jsonl-validation', [expect.objectContaining({ message: 'editor.invalidJsonl:1' })]);
    markers.mockClear();
    view.rerender(component('yaml', '{bad', 'old error'));
    expect(markers).toHaveBeenCalledWith(model, 'jsonl-validation', []);
    expect(markers).toHaveBeenCalledWith(model, 'json-validation', [expect.objectContaining({ message: 'old error' })]);
    view.rerender(component('json', '{}'));
    expect(markers).toHaveBeenLastCalledWith(model, 'json-validation', []);
    view.rerender(component('jsonl', '{}'));
    expect(markers).toHaveBeenCalledWith(model, 'jsonl-validation', []);
    expect(markers.mock.calls.every(([, owner]) => ['jsonl-validation', 'json-validation'].includes(owner))).toBe(true);
    expect(diagnostics).toHaveBeenCalledTimes(1);
  });
  it('moves markers to a replacement model and disposes listeners on unmount', () => {
    const markers = vi.fn(); const disposePaste = vi.fn(); const disposeModel = vi.fn();
    const monaco = { json: { jsonDefaults: { setDiagnosticsOptions: vi.fn() } }, editor: { setModelMarkers: markers }, MarkerSeverity: { Error: 8 } };
    const first = setupModel().model; const second = setupModel().model;
    let model = first; let modelChanged = () => {};
    const editor = { getModel: () => model, onDidPaste: () => ({ dispose: disposePaste }), onDidChangeModel: (callback: () => void) => { modelChanged = callback; return { dispose: disposeModel }; }, updateOptions: vi.fn() };
    const view = render(component('jsonl'));
    act(() => mocks.mounts[0](editor, monaco));
    markers.mockClear();
    act(() => { model = second; modelChanged(); });
    expect(markers).toHaveBeenCalledWith(first, 'jsonl-validation', []);
    expect(markers).toHaveBeenCalledWith(second, 'jsonl-validation', [expect.objectContaining({ message: 'editor.invalidJsonl:1' })]);
    view.unmount();
    expect(markers).toHaveBeenCalledWith(second, 'jsonl-validation', []);
    expect(disposePaste).toHaveBeenCalled();
    expect(disposeModel).toHaveBeenCalled();
  });

});
