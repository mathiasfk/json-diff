import { Suspense, lazy, useState, useEffect } from 'react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Header } from './components/Header';
import { SupportFooter } from './components/SupportFooter';
import { useTranslation } from 'react-i18next';
import { JsonEditor } from './components/JsonEditor';
const DiffViewer = lazy(() => import('./components/DiffViewer').then(m => ({ default: m.DiffViewer })));
import { semanticDiff, formatJSON } from './utils/semanticDiff';
import type { ArrayComparison } from './utils/semanticDiff';
import { parse, serialize, formatSameFormatDiff, FormatError, DEFAULT_FORMAT } from './utils/formatSelector';
import type { Format } from './utils/formatSelector';
import { gtag } from './services/analytics';

type ViewMode = 'edit' | 'compare';
type InputError = { key: 'errors.empty' | 'errors.invalid' | 'errors.invalidDetail'; message?: string };
const COMPARISON_HISTORY_KEY = 'jsonDiffComparison';

function App() {
  const { t } = useTranslation();
  const LS_KEYS = {
    left: 'jsonDiff.left',
    right: 'jsonDiff.right',
    leftFormat: 'jsonDiff.leftFormat',
    rightFormat: 'jsonDiff.rightFormat',
    mode: 'jsonDiff.viewMode',
    diff: 'jsonDiff.diffResult',
    arrayComparison: 'jsonDiff.arrayComparison',
  } as const;

  // Initialize with empty values to avoid blocking on first render
  const [leftJson, setLeftJson] = useState('');
  const [rightJson, setRightJson] = useState('');
  const [leftFormat, setLeftFormat] = useState<Format>(DEFAULT_FORMAT);
  const [rightFormat, setRightFormat] = useState<Format>(DEFAULT_FORMAT);
  const [leftError, setLeftError] = useState<InputError | null>(null);
  const [rightError, setRightError] = useState<InputError | null>(null);
  const [arrayComparison, setArrayComparison] = useState<ArrayComparison>('semantic');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [diffResult, setDiffResult] = useState<{
    left: string;
    right: string;
    language: string;
    hasDifferences: boolean;
    arrayComparison: ArrayComparison;
  } | null>(null);

  const [storageLoaded, setStorageLoaded] = useState(false);
  const [confirmExampleOpen, setConfirmExampleOpen] = useState(false);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      if ((event.state?.[COMPARISON_HISTORY_KEY] || event.state?.usr?.[COMPARISON_HISTORY_KEY]) && diffResult) {
        setViewMode('compare');
      } else {
        setViewMode('edit');
        setLeftError(null);
        setRightError(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [diffResult]);

  const handleLoadExample = () => {
    if (!storageLoaded) return;
    if (leftJson.trim() || rightJson.trim()) {
      setConfirmExampleOpen(true);
      return;
    }
    loadExample();
  };

  const loadExample = () => {
    setConfirmExampleOpen(false);
    setLeftFormat('json');
    setRightFormat('json');
    setLeftError(null);
    setRightError(null);
    setDiffResult(null);
    setLeftJson(JSON.stringify({ team: 'Demo', members: [
      { id: 1, name: 'Ana', role: 'developer' },
      { id: 2, name: 'Sam', role: 'designer' },
    ] }, null, 2));
    setRightJson(JSON.stringify({ members: [
      { role: 'designer', name: 'Sam', id: 2 },
      { role: 'lead', name: 'Ana', id: 1 },
    ], team: 'Demo' }, null, 2));
    gtag('event', 'load_example');
  };

  // Load from localStorage after initial render to avoid blocking
  useEffect(() => {
    try {
      const storedLeft = localStorage.getItem(LS_KEYS.left);
      const storedRight = localStorage.getItem(LS_KEYS.right);
      const storedLeftFormat = localStorage.getItem(LS_KEYS.leftFormat);
      const storedRightFormat = localStorage.getItem(LS_KEYS.rightFormat);
      const storedMode = localStorage.getItem(LS_KEYS.mode);
      const storedDiff = localStorage.getItem(LS_KEYS.diff);
      const storedArrayComparison = localStorage.getItem(LS_KEYS.arrayComparison);
      if (storedArrayComparison === 'position' || storedArrayComparison === 'semantic') {
        setArrayComparison(storedArrayComparison);
      }

      if (storedLeft !== null) setLeftJson(storedLeft);
      if (storedRight !== null) setRightJson(storedRight);
      if (storedLeftFormat === 'json' || storedLeftFormat === 'jsonl' ||
          storedLeftFormat === 'yaml') {
        setLeftFormat(storedLeftFormat);
      }
      if (storedRightFormat === 'json' || storedRightFormat === 'jsonl' ||
          storedRightFormat === 'yaml') {
        setRightFormat(storedRightFormat);
      }
      if (storedDiff) {
        try {
          const saved: unknown = JSON.parse(storedDiff);
          if (saved && typeof saved === 'object' &&
              'left' in saved && typeof saved.left === 'string' &&
              'right' in saved && typeof saved.right === 'string' &&
              'language' in saved && typeof saved.language === 'string' &&
              ['json', 'jsonl', 'yaml'].includes(saved.language) &&
              'hasDifferences' in saved && typeof saved.hasDifferences === 'boolean') {
            setDiffResult({
              left: saved.left,
              right: saved.right,
              language: saved.language,
              hasDifferences: saved.hasDifferences,
              arrayComparison: 'arrayComparison' in saved && saved.arrayComparison === 'position'
                ? 'position'
                : 'semantic',
            });
            if (storedMode === 'compare') setViewMode('compare');
          }
        } catch {
          // Ignore parse errors
        }
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setStorageLoaded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Persist only after restoring saved state.
  // Persist changes
  useEffect(() => {
    if (!storageLoaded) return;
    try {
      localStorage.setItem('jsonDiff.left', leftJson);
    } catch { void 0; }
  }, [leftJson, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      localStorage.setItem('jsonDiff.right', rightJson);
    } catch { void 0; }
  }, [rightJson, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      localStorage.setItem('jsonDiff.leftFormat', leftFormat);
    } catch { void 0; }
  }, [leftFormat, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      localStorage.setItem('jsonDiff.rightFormat', rightFormat);
    } catch { void 0; }
  }, [rightFormat, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      localStorage.setItem('jsonDiff.viewMode', viewMode);
    } catch { void 0; }
  }, [viewMode, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      if (diffResult) {
        localStorage.setItem('jsonDiff.diffResult', JSON.stringify(diffResult));
      } else {
        localStorage.removeItem('jsonDiff.diffResult');
      }
    } catch { void 0; }
  }, [diffResult, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded) return;
    try { localStorage.setItem('jsonDiff.arrayComparison', arrayComparison); } catch { void 0; }
  }, [arrayComparison, storageLoaded]);

  const parseInput = (text: string, format: Format): { valid: boolean; parsed?: unknown; error?: InputError } => {
    if (!text.trim()) {
      return { valid: false, error: { key: 'errors.empty' } };
    }

    try {
      const parsed = parse(text, format);
      return { valid: true, parsed };
    } catch (error) {
      const message = error instanceof FormatError
        ? error.message
        : error instanceof Error
          ? error.message
          : '';
      return { valid: false, error: message ? { key: 'errors.invalidDetail', message } : { key: 'errors.invalid' } };
    }
  };

  const handleArrayComparisonChange = (mode: ArrayComparison) => {
    if (mode === arrayComparison) return;
    gtag('event', 'array_comparison_change', {
      array_comparison: mode,
      previous_array_comparison: arrayComparison,
    });
    setArrayComparison(mode);
  };

  const handleCompare = () => {
    setLeftError(null);
    setRightError(null);

    gtag('event', 'compare_click', {
      left_chars: leftJson.length,
      right_chars: rightJson.length,
      array_comparison: arrayComparison,
    });

    const leftResult = parseInput(leftJson, leftFormat);
    const rightResult = parseInput(rightJson, rightFormat);

    if (!leftResult.valid) {
      gtag('event', 'invalid_input', { side: 'left', format: leftFormat });
      setLeftError(leftResult.error || { key: 'errors.invalid' });
      return;
    }

    if (!rightResult.valid) {
      gtag('event', 'invalid_input', { side: 'right', format: rightFormat });
      setRightError(rightResult.error || { key: 'errors.invalid' });
      return;
    }

    const result = semanticDiff(leftResult.parsed, rightResult.parsed, { arrayComparison });

    // When both sides share the same format (json/jsonl/yaml), re-serialize the
    // normalized objects back into that dialect so the diff shows the original
    // format instead of canonical JSON. Otherwise fall back to JSON display.
    const sameFormat = leftFormat === rightFormat
      ? formatSameFormatDiff(result.left, result.right, leftFormat)
      : null;

    const formattedLeft = sameFormat ? sameFormat.left : formatJSON(result.left);
    const formattedRight = sameFormat ? sameFormat.right : formatJSON(result.right);
    const language = sameFormat ? leftFormat : 'json';

    const hasDifferences = result.delta !== undefined;

    gtag('event', 'compare_completed', {
      has_differences: hasDifferences ? 1 : 0,
      left_chars: leftJson.length,
      right_chars: rightJson.length,
      left_format: leftFormat,
      right_format: rightFormat,
      array_comparison: arrayComparison,
    });

    setDiffResult({
      left: formattedLeft,
      right: formattedRight,
      language,
      hasDifferences,
      arrayComparison,
    });

    // Preserve the router's history state, including its navigation index.
    const historyState = window.history.state || {};
    window.history.pushState({
      ...historyState,
      idx: typeof historyState.idx === 'number' ? historyState.idx + 1 : historyState.idx,
      [COMPARISON_HISTORY_KEY]: true,
    }, '');
    setViewMode('compare');
  };

  const handleReset = () => {
    gtag('event', 'back_to_edit');
    setViewMode('edit');
    if (window.history.state?.[COMPARISON_HISTORY_KEY]) window.history.back();
    else if (window.history.state?.usr?.[COMPARISON_HISTORY_KEY]) {
      const state = window.history.state;
      window.history.replaceState({ ...state, usr: { ...state.usr, [COMPARISON_HISTORY_KEY]: false } }, '');
    }
    setLeftError(null);
    setRightError(null);
  };

  const handleFormat = (side: 'left' | 'right') => {
    gtag('event', 'format_click', { side });
    const text = side === 'left' ? leftJson : rightJson;
    const format = side === 'left' ? leftFormat : rightFormat;
    const result = parseInput(text, format);

    if (result.valid) {
      // Sort JSON object properties while preserving the original array order;
      // for other formats re-serialize cleanly.
      const formatted = format === 'json'
        ? formatJSON(result.parsed, true, 'position')
        : serialize(result.parsed, format);
      if (side === 'left') {
        setLeftJson(formatted);
        setLeftError(null);
      } else {
        setRightJson(formatted);
        setRightError(null);
      }
    } else if (side === 'left') {
      setLeftError(result.error || { key: 'errors.invalid' });
    } else {
      setRightError(result.error || { key: 'errors.invalid' });
    }
  };

  const handleClear = (side: 'left' | 'right') => {
    gtag('event', 'clear_click', { side });
    if (side === 'left') {
      setLeftJson('');
      setLeftError(null);
    } else {
      setRightJson('');
      setRightError(null);
    }
  };

  const handleLeftChange = (newValue: string) => {
    setLeftJson(newValue);
    // Clear error if the input becomes parseable
    if (leftError && (!newValue.trim() || parseInput(newValue, leftFormat).valid)) setLeftError(null);
  };

  const handleRightChange = (newValue: string) => {
    setRightJson(newValue);
    // Clear error if the input becomes parseable
    if (rightError && (!newValue.trim() || parseInput(newValue, rightFormat).valid)) setRightError(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 relative">
      <Header />
      {confirmExampleOpen && <ConfirmDialog
        title={t('app.replaceExampleTitle')}
        description={t('app.replaceWithExample')}
        cancelLabel={t('app.cancel')}
        confirmLabel={t('app.confirmLoadExample')}
        onCancel={() => setConfirmExampleOpen(false)}
        onConfirm={loadExample}
      />}

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4" role="main">
        {viewMode === 'edit' ? (
          <div className="flex flex-col min-h-[calc(100vh-180px)] lg:min-h-0 lg:h-[max(36rem,calc(100dvh-180px))]">
            <div className="grid grid-cols-1 grid-rows-2 lg:grid-rows-1 lg:grid-cols-2 gap-4 h-[80vh] lg:h-auto lg:flex-1 lg:min-h-0" role="region" aria-label={t('jsonEditor.inputEditors')}>
              <JsonEditor
                value={leftJson}
                onChange={handleLeftChange}
                onFormatChange={(format) => { setLeftFormat(format); setLeftError(null); }}
                format={leftFormat}
                error={leftError ? t(leftError.key, { message: leftError.message }) : undefined}
                label={t('jsonEditor.leftInput')}
                onFormat={() => handleFormat('left')}
                onClear={() => handleClear('left')}
                side="left"
              />
              <JsonEditor
                value={rightJson}
                onChange={handleRightChange}
                onFormatChange={(format) => { setRightFormat(format); setRightError(null); }}
                format={rightFormat}
                error={rightError ? t(rightError.key, { message: rightError.message }) : undefined}
                label={t('jsonEditor.rightInput')}
                onFormat={() => handleFormat('right')}
                onClear={() => handleClear('right')}
                side="right"
              />
            </div>

            <fieldset className="mt-4 mx-auto max-w-3xl w-full sm:w-fit border border-gray-700 rounded-lg px-4 pb-2 text-center shrink-0">
              <legend className="mx-auto px-2 text-sm text-gray-400">{t('arrayComparison.legend')}</legend>
              <div className="mt-1 flex flex-wrap justify-center gap-x-6 gap-y-1">
                {(['semantic', 'position'] as const).map(mode => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer rounded px-1 py-1 text-sm text-gray-200 hover:text-gray-100">
                    <input
                      type="radio"
                      name="arrayComparison"
                      value={mode}
                      checked={arrayComparison === mode}
                      onChange={() => handleArrayComparisonChange(mode)}
                      aria-labelledby={`array-${mode}-label`}
                      aria-describedby={arrayComparison === mode ? 'array-comparison-description' : undefined}
                      className="accent-[#3268b3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                    />
                    <span id={`array-${mode}-label`}>
                      {t(`arrayComparison.${mode}`)}
                    </span>
                  </label>
                ))}
              </div>
              {/* Both descriptions size the same grid cell, so switching modes
                  preserves its width and height at every viewport and locale. */}
              <div aria-live="polite" aria-atomic="true" className="mt-1 grid text-sm text-gray-400">
                {(['semantic', 'position'] as const).map(mode => (
                  <p
                    key={mode}
                    id={arrayComparison === mode ? 'array-comparison-description' : undefined}
                    aria-hidden={arrayComparison !== mode}
                    className={`col-start-1 row-start-1 ${arrayComparison !== mode ? 'invisible' : ''}`}
                  >
                    {t(`arrayComparison.${mode}Description`)}
                  </p>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-3 shrink-0" role="toolbar" aria-label={t('jsonEditor.comparisonActions')}>
              <button onClick={handleCompare} className="min-h-10 px-8 py-2 bg-[#3268b3] hover:bg-[#285693] text-white font-medium rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!leftJson.trim() || !rightJson.trim()} aria-label={t('jsonEditor.compare')}>
                {t('app.compare')}
              </button>
              <button type="button" onClick={handleLoadExample} disabled={!storageLoaded} className="text-sm text-gray-400 hover:text-gray-100 underline underline-offset-4 disabled:opacity-50">
                {t('app.loadExample')}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-180px)]" role="region" aria-label={t('jsonEditor.comparisonResults')}>
            <Suspense fallback={<div className="text-gray-300">{t('jsonEditor.loadingDiff')}</div>}>
              {diffResult && (
                <DiffViewer
                  oldValue={diffResult.left}
                  newValue={diffResult.right}
                  language={diffResult.language}
                  onReset={handleReset}
                  hasDifferences={diffResult.hasDifferences}
                  arrayComparison={diffResult.arrayComparison}
                />
              )}
            </Suspense>
          </div>
        )}
      </main>
      <SupportFooter />
    </div>
  );
}

export default App;
