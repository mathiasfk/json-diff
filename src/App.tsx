import { Suspense, lazy, useState, useEffect } from 'react';
import { Header } from './components/Header';
import { JsonEditor } from './components/JsonEditor';
const DiffViewer = lazy(() => import('./components/DiffViewer').then(m => ({ default: m.DiffViewer })));
import { semanticDiff, formatJSON } from './utils/semanticDiff';
import { gtag } from './services/analytics';

type ViewMode = 'edit' | 'compare';

function App() {
  const LS_KEYS = {
    left: 'jsonDiff.left',
    right: 'jsonDiff.right',
    mode: 'jsonDiff.viewMode',
    diff: 'jsonDiff.diffResult',
  } as const;

  // Initialize with empty values to avoid blocking on first render
  const [leftJson, setLeftJson] = useState('');
  const [rightJson, setRightJson] = useState('');
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
      const storedMode = localStorage.getItem(LS_KEYS.mode);
      const storedDiff = localStorage.getItem(LS_KEYS.diff);
      
      if (storedLeft !== null) setLeftJson(storedLeft);
      if (storedRight !== null) setRightJson(storedRight);
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

  const validateAndParse = (json: string): { valid: boolean; parsed?: unknown; error?: string } => {
    if (!json.trim()) {
      return { valid: false, error: 'JSON cannot be empty' };
    }

    try {
      const parsed = JSON.parse(json);
      return { valid: true, parsed };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  };

  const handleCompare = () => {
    setLeftError('');
    setRightError('');

    gtag('event', 'compare_click', { left_chars: leftJson.length, right_chars: rightJson.length });

    const leftResult = validateAndParse(leftJson);
    const rightResult = validateAndParse(rightJson);

    if (!leftResult.valid) {
      gtag('event', 'invalid_json', { side: 'left' });
      setLeftError(leftResult.error || 'Invalid JSON');
      return;
    }

    if (!rightResult.valid) {
      gtag('event', 'invalid_json', { side: 'right' });
      setRightError(rightResult.error || 'Invalid JSON');
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
    const json = side === 'left' ? leftJson : rightJson;
    const result = validateAndParse(json);

    if (result.valid && result.parsed) {
      // Apply the same normalization used in comparison (sort arrays and properties)
      const formatted = formatJSON(result.parsed, true);
      if (side === 'left') {
        setLeftJson(formatted);
        setLeftError('');
      } else {
        setRightJson(formatted);
        setRightError('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header />

      <main className="max-w-screen-2xl mx-auto p-6" role="main">
        {viewMode === 'edit' ? (
          <div className="flex flex-col h-[calc(100vh-180px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1" role="region" aria-label="JSON input editors">
              <JsonEditor
                value={leftJson}
                onChange={setLeftJson}
                error={leftError}
                label="Left JSON"
              />
              <JsonEditor
                value={rightJson}
                onChange={setRightJson}
                error={rightError}
                label="Right JSON"
              />
            </div>

            <div className="flex items-center justify-center gap-4 mt-6" role="toolbar" aria-label="JSON comparison actions">
              <button
                onClick={() => handleFormat('left')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!leftJson.trim()}
                aria-label="Format and beautify the left JSON input"
              >
                Format Left
              </button>
              <button
                onClick={handleCompare}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!leftJson.trim() || !rightJson.trim()}
                aria-label="Compare the two JSON objects semantically"
              >
                Compare JSONs
              </button>
              <button
                onClick={() => handleFormat('right')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!rightJson.trim()}
                aria-label="Format and beautify the right JSON input"
              >
                Format Right
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

