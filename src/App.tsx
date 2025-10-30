import { useState } from 'react';
import { JsonEditor } from './components/JsonEditor';
import { DiffViewer } from './components/DiffViewer';
import { semanticDiff, formatJSON } from './utils/semanticDiff';

type ViewMode = 'edit' | 'compare';

function App() {
  const [leftJson, setLeftJson] = useState('');
  const [rightJson, setRightJson] = useState('');
  const [leftError, setLeftError] = useState('');
  const [rightError, setRightError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [diffResult, setDiffResult] = useState<{
    left: string;
    right: string;
  } | null>(null);

  const validateAndParse = (json: string): { valid: boolean; parsed?: any; error?: string } => {
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

    const leftResult = validateAndParse(leftJson);
    const rightResult = validateAndParse(rightJson);

    if (!leftResult.valid) {
      setLeftError(leftResult.error || 'Invalid JSON');
      return;
    }

    if (!rightResult.valid) {
      setRightError(rightResult.error || 'Invalid JSON');
      return;
    }

    // Perform semantic diff
    const result = semanticDiff(leftResult.parsed, rightResult.parsed);

    // Format the normalized JSONs for display
    const formattedLeft = formatJSON(result.left);
    const formattedRight = formatJSON(result.right);

    setDiffResult({
      left: formattedLeft,
      right: formattedRight,
    });

    setViewMode('compare');
  };

  const handleReset = () => {
    setViewMode('edit');
    setDiffResult(null);
    setLeftError('');
    setRightError('');
  };

  const handleFormat = (side: 'left' | 'right') => {
    const json = side === 'left' ? leftJson : rightJson;
    const result = validateAndParse(json);

    if (result.valid && result.parsed) {
      const formatted = formatJSON(result.parsed);
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
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto">
          <h1 className="text-2xl font-bold">Semantic JSON Comparator</h1>
          <p className="text-sm text-gray-400 mt-1">
            Compare JSON objects semantically with smart array matching
          </p>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-6">
        {viewMode === 'edit' ? (
          <div className="flex flex-col h-[calc(100vh-180px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
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

            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => handleFormat('left')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!leftJson.trim()}
              >
                Format Left
              </button>
              <button
                onClick={handleCompare}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!leftJson.trim() || !rightJson.trim()}
              >
                Compare JSONs
              </button>
              <button
                onClick={() => handleFormat('right')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!rightJson.trim()}
              >
                Format Right
              </button>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-180px)]">
            {diffResult && (
              <DiffViewer
                oldValue={diffResult.left}
                newValue={diffResult.right}
                onReset={handleReset}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

