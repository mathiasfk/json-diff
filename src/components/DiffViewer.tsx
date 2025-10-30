import React from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';

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
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-100">
          Comparison Results
        </h2>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors"
        >
          ← Back to Edit
        </button>
      </div>
      
      {!hasDifferences ? (
        <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg">
          <div className="text-center px-8 py-12">
            <div className="mb-4">
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
        <div className="flex-1 overflow-auto bg-gray-900 rounded-lg">
          <ReactDiffViewer
            oldValue={oldValue}
            newValue={newValue}
            splitView={true}
            useDarkTheme={true}
            leftTitle="Left JSON"
            rightTitle="Right JSON"
            styles={{
              variables: {
                dark: {
                  diffViewerBackground: '#1a1a1a',
                  diffViewerColor: '#e5e7eb',
                  addedBackground: '#064e3b',
                  addedColor: '#a7f3d0',
                  removedBackground: '#7f1d1d',
                  removedColor: '#fca5a5',
                  wordAddedBackground: '#065f46',
                  wordRemovedBackground: '#991b1b',
                  addedGutterBackground: '#064e3b',
                  removedGutterBackground: '#7f1d1d',
                  gutterBackground: '#262626',
                  gutterBackgroundDark: '#1a1a1a',
                  highlightBackground: '#374151',
                  highlightGutterBackground: '#4b5563',
                },
              },
              line: {
                padding: '0.5rem',
                fontSize: '0.875rem',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              },
            }}
            compareMethod={"diffWords" as any}
          />
        </div>
      )}
    </div>
  );
};

