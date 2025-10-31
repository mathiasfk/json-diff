import React from 'react';
import { DiffEditor } from '@monaco-editor/react';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  onReset: () => void;
  hasDifferences: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  oldValue,
  newValue,
  onReset,
  hasDifferences,
}) => {
  return (
    <div className="h-full flex flex-col" role="region" aria-label="JSON comparison results">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-100">
          Comparison Results
        </h2>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors"
          aria-label="Return to JSON input editors"
        >
          ← Back to Edit
        </button>
      </div>
      
      {!hasDifferences ? (
        <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg" role="status" aria-live="polite">
          <div className="text-center px-8 py-12">
            <div className="mb-4" aria-hidden="true">
              <svg
                className="mx-auto h-16 w-16 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-100 mb-2">
              JSONs are identical!
            </h3>
            <p className="text-gray-400">
              No differences found between the two JSONs after semantic normalization.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden bg-gray-900 rounded-lg border border-gray-700" role="region" aria-label="JSON differences view">
          <DiffEditor
            height="100%"
            language="json"
            theme="vs-dark"
            original={oldValue}
            modified={newValue}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              readOnly: true,
              renderSideBySide: true,
              automaticLayout: true,
              renderOverviewRuler: true,
              ignoreTrimWhitespace: false,
              renderIndicators: true,
            }}
          />
        </div>
      )}
    </div>
  );
};

