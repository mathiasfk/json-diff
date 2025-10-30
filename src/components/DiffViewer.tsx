import React from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  onReset: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  oldValue,
  newValue,
  onReset,
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
    </div>
  );
};

