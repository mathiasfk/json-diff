import { Suspense, lazy, useState, useEffect } from 'react';
import { Header } from './components/Header';
import { JsonEditor } from './components/JsonEditor';
const DiffViewer = lazy(() => import('./components/DiffViewer').then(m => ({ default: m.DiffViewer })));
import { semanticDiff, formatJSON } from './utils/semanticDiff';
import { parse, serialize, FormatError, DEFAULT_FORMAT } from './utils/formatSelector';
import type { Format } from './utils/formatSelector';
import { gtag } from './services/analytics';

type ViewMode = 'edit' | 'compare';

function App() {
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
  const [leftError, setLeftError] = useState('');
  const [rightError, setRightError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [diffResult, setDiffResult] = useState<{
    left: string;
    right: string;
    hasDifferences: boolean;
  } | null>(null);

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
          storedLeftFormat === 'yaml' || storedLeftFormat === 'csv' || storedLeftFormat === 'tsv') {
        setLeftFormat(storedLeftFormat);
      }
      if (storedRightFormat === 'json' || storedRightFormat === 'jsonl' ||
          storedRightFormat === 'yaml' || storedRightFormat === 'csv' || storedRightFormat === 'tsv') {
        setRightFormat(storedRightFormat);
      }
      if (storedMode === 'compare') setViewMode('compare');
      if (storedDiff) {
        try {
          setDiffResult(JSON.parse(storedDiff));
        } catch {
          // Ignore parse errors
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Persist changes
  useEffect(() => {
    try {
      localStorage.setItem('jsonDiff.left', leftJson);
    } catch { void 0; }
  }, [leftJson]);

  useEffect(() => {
    try {
      localStorage.setItem('jsonDiff.right', rightJson);
    } catch { void 0; }
  }, [rightJson]);

  useEffect(() => {
    try {
      localStorage.setItem('jsonDiff.leftFormat', leftFormat);
    } catch { void 0; }
  }, [leftFormat]);

  useEffect(() => {
    try {
      localStorage.setItem('jsonDiff.rightFormat', rightFormat);
    } catch { void 0; }
  }, [rightFormat]);

  useEffect(() => {
    try {
      localStorage.setItem('jsonDiff.viewMode', viewMode);
    } catch { void 0; }
  }, [viewMode]);

  useEffect(() => {
    try {
      if (diffResult) {
        localStorage.setItem('jsonDiff.diffResult', JSON.stringify(diffResult));
      } else {
        localStorage.removeItem('jsonDiff.diffResult');
      }
    } catch { void 0; }
  }, [diffResult]);

  const parseInput = (text: string, format: Format): { valid: boolean; parsed?: unknown; error?: string } => {
    if (!text.trim()) {
      return { valid: false, error: 'Input cannot be empty' };
    }

    try {
      const parsed = parse(text, format);
      return { valid: true, parsed };
    } catch (error) {
      const message = error instanceof FormatError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Invalid input';
      return { valid: false, error: message };
    }
  };

  const handleCompare = () => {
    setLeftError('');
    setRightError('');

    gtag('event', 'compare_click', { left_chars: leftJson.length, right_chars: rightJson.length });

    const leftResult = parseInput(leftJson, leftFormat);
    const rightResult = parseInput(rightJson, rightFormat);

    if (!leftResult.valid) {
      gtag('event', 'invalid_input', { side: 'left', format: leftFormat });
      setLeftError(leftResult.error || 'Invalid input');
      return;
    }

    if (!rightResult.valid) {
      gtag('event', 'invalid_input', { side: 'right', format: rightFormat });
      setRightError(rightResult.error || 'Invalid input');
      return;
    }

    const result = semanticDiff(leftResult.parsed, rightResult.parsed);

    const formattedLeft = formatJSON(result.left);
    const formattedRight = formatJSON(result.right);

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
      hasDifferences,
    });

    setViewMode('compare');
  };

  const handleReset = () => {
    gtag('event', 'back_to_edit');
    setViewMode('edit');
    setDiffResult(null);
    setLeftError('');
    setRightError('');
  };

  const handleFormat = (side: 'left' | 'right') => {
    gtag('event', 'format_click', { side });
    const text = side === 'left' ? leftJson : rightJson;
    const format = side === 'left' ? leftFormat : rightFormat;
    const result = parseInput(text, format);

    if (result.valid && result.parsed) {
      // Apply the same normalization used in comparison (sort arrays and
      // properties) for JSON; for other formats re-serialize cleanly.
      const formatted = format === 'json'
        ? formatJSON(result.parsed, true)
        : serialize(result.parsed, format);
      if (side === 'left') {
        setLeftJson(formatted);
        setLeftError('');
      } else {
        setRightJson(formatted);
        setRightError('');
      }
    }
  };

  const handleClear = (side: 'left' | 'right') => {
    gtag('event', 'clear_click', { side });
    if (side === 'left') {
      setLeftJson('');
      setLeftError('');
    } else {
      setRightJson('');
      setRightError('');
    }
  };

  const handleLeftChange = (newValue: string) => {
    setLeftJson(newValue);
    // Clear error if the input becomes parseable
    if (newValue.trim()) {
      const result = parseInput(newValue, leftFormat);
      if (result.valid) setLeftError('');
    }
  };

  const handleRightChange = (newValue: string) => {
    setRightJson(newValue);
    // Clear error if the input becomes parseable
    if (newValue.trim()) {
      const result = parseInput(newValue, rightFormat);
      if (result.valid) setRightError('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header />

      <main className="max-w-screen-2xl mx-auto p-6" role="main">
        {viewMode === 'edit' ? (
          <div className="flex flex-col h-[calc(100vh-180px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1" role="region" aria-label="Diff input editors">
              <JsonEditor
                value={leftJson}
                onChange={handleLeftChange}
                onFormatChange={setLeftFormat}
                format={leftFormat}
                error={leftError}
                label="Left Input"
                side="left"
              />
              <JsonEditor
                value={rightJson}
                onChange={handleRightChange}
                onFormatChange={setRightFormat}
                format={rightFormat}
                error={rightError}
                label="Right Input"
                side="right"
              />
            </div>

            <div className="flex items-center justify-center gap-4 mt-6" role="toolbar" aria-label="Comparison actions">
              <button
                onClick={() => handleClear('left')}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!leftJson.trim()}
                aria-label="Clear the left input"
              >
                Clear Left
              </button>
              <button
                onClick={() => handleFormat('left')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!leftJson.trim()}
                aria-label="Format and beautify the left input"
              >
                Format Left
              </button>
              <button
                onClick={handleCompare}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!leftJson.trim() || !rightJson.trim()}
                aria-label="Compare the two inputs semantically"
              >
                Compare
              </button>
              <button
                onClick={() => handleFormat('right')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!rightJson.trim()}
                aria-label="Format and beautify the right input"
              >
                Format Right
              </button>
              <button
                onClick={() => handleClear('right')}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!rightJson.trim()}
                aria-label="Clear the right input"
              >
                Clear Right
              </button>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-180px)]" role="region" aria-label="Comparison results">
            <Suspense fallback={<div className="text-gray-300">Loading diff…</div>}>
              {diffResult && (
                <DiffViewer
                  oldValue={diffResult.left}
                  newValue={diffResult.right}
                  onReset={handleReset}
                  hasDifferences={diffResult.hasDifferences}
                />
              )}
            </Suspense>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
