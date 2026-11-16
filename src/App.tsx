import { Suspense, lazy, useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SupportFooter } from './components/SupportFooter';
import { useTranslation } from 'react-i18next';
import { JsonEditor } from './components/JsonEditor';
const DiffViewer = lazy(() => import('./components/DiffViewer').then(m => ({ default: m.DiffViewer })));
import { semanticDiff, formatJSON } from './utils/semanticDiff';
import { parse, serialize, formatSameFormatDiff, FormatError, DEFAULT_FORMAT } from './utils/formatSelector';
import type { Format } from './utils/formatSelector';
import { gtag } from './services/analytics';

type ViewMode = 'edit' | 'compare';
type InputError = { key: 'errors.empty' | 'errors.invalid' | 'errors.invalidDetail'; message?: string };

function App() {
  const { t } = useTranslation();
  const LS_KEYS = {
    left: 'jsonDiff.left',
    right: 'jsonDiff.right',
    leftFormat: 'jsonDiff.leftFormat',
    rightFormat: 'jsonDiff.rightFormat',
    mode: 'jsonDiff.viewMode',
    diff: 'jsonDiff.diffResult',
  } as const;

  // Initialize with empty values to avoid blocking on first render
  const [leftJson, setLeftJson] = useState('');
  const [rightJson, setRightJson] = useState('');
  const [leftFormat, setLeftFormat] = useState<Format>(DEFAULT_FORMAT);
  const [rightFormat, setRightFormat] = useState<Format>(DEFAULT_FORMAT);
  const [leftError, setLeftError] = useState<InputError | null>(null);
  const [rightError, setRightError] = useState<InputError | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [diffResult, setDiffResult] = useState<{
    left: string;
    right: string;
    language: string;
    hasDifferences: boolean;
  } | null>(null);

  const [storageLoaded, setStorageLoaded] = useState(false);

  const handleLoadExample = () => {
    if (!storageLoaded) return;
    if ((leftJson.trim() || rightJson.trim()) && !window.confirm(t('app.replaceWithExample'))) return;
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
            setDiffResult({ left: saved.left, right: saved.right, language: saved.language, hasDifferences: saved.hasDifferences });
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

  const handleCompare = () => {
    setLeftError(null);
    setRightError(null);

    gtag('event', 'compare_click', { left_chars: leftJson.length, right_chars: rightJson.length });

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

    const result = semanticDiff(leftResult.parsed, rightResult.parsed);

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
    });

    setDiffResult({
      left: formattedLeft,
      right: formattedRight,
      language,
      hasDifferences,
    });

    setViewMode('compare');
  };

  const handleReset = () => {
    gtag('event', 'back_to_edit');
    setViewMode('edit');
    setDiffResult(null);
    setLeftError(null);
    setRightError(null);
  };

  const handleFormat = (side: 'left' | 'right') => {
    gtag('event', 'format_click', { side });
    const text = side === 'left' ? leftJson : rightJson;
    const format = side === 'left' ? leftFormat : rightFormat;
    const result = parseInput(text, format);

    if (result.valid) {
      // Apply the same normalization used in comparison (sort arrays and
      // properties) for JSON; for other formats re-serialize cleanly.
      const formatted = format === 'json'
        ? formatJSON(result.parsed, true)
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

      <main className="max-w-screen-2xl mx-auto p-6" role="main">
        {viewMode === 'edit' ? (
          <div className="flex flex-col h-[calc(100vh-180px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1" role="region" aria-label={t('jsonEditor.inputEditors')}>
              <JsonEditor
                value={leftJson}
                onChange={handleLeftChange}
                onFormatChange={(format) => { setLeftFormat(format); setLeftError(null); }}
                format={leftFormat}
                error={leftError ? t(leftError.key, { message: leftError.message }) : undefined}
                label={t('jsonEditor.leftInput')}
                side="left"
              />
              <JsonEditor
                value={rightJson}
                onChange={handleRightChange}
                onFormatChange={(format) => { setRightFormat(format); setRightError(null); }}
                format={rightFormat}
                error={rightError ? t(rightError.key, { message: rightError.message }) : undefined}
                label={t('jsonEditor.rightInput')}
                side="right"
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-[repeat(5,auto)] items-center justify-center gap-x-2 lg:gap-x-4 gap-y-2 mt-6 shrink-0" role="toolbar" aria-label={t('jsonEditor.comparisonActions')}>
              <button
                onClick={() => handleClear('left')}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!leftJson.trim()}
                aria-label={t('jsonEditor.clearLeft')}
              >
                {t('app.clearLeft')}
              </button>
              <button
                onClick={() => handleFormat('left')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!leftJson.trim()}
                aria-label={t('jsonEditor.formatLeft')}
              >
                {t('app.formatLeft')}
              </button>
              <button
                onClick={handleCompare}
                className="col-span-2 row-start-3 justify-self-center lg:col-span-1 lg:col-start-3 lg:row-start-1 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!leftJson.trim() || !rightJson.trim()}
                aria-label={t('jsonEditor.compare')}
              >
                {t('app.compare')}
              </button>
              <button
                onClick={() => handleFormat('right')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!rightJson.trim()}
                aria-label={t('jsonEditor.formatRight')}
              >
                {t('app.formatRight')}
              </button>
              <button
                onClick={() => handleClear('right')}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!rightJson.trim()}
                aria-label={t('jsonEditor.clearRight')}
              >
                {t('app.clearRight')}
              </button>
              <div className="col-span-2 row-start-4 lg:col-span-1 lg:col-start-3 lg:row-start-2 justify-self-center flex items-baseline gap-1 text-sm text-gray-400">
                <span>{t('app.or')}</span>
                <button
                  type="button"
                  onClick={handleLoadExample}
                  disabled={!storageLoaded}
                  className="hover:text-gray-200 underline underline-offset-4 disabled:opacity-50"
                >
                  {t('app.loadExample')}
                </button>
              </div>
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
