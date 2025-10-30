import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  label: string;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  placeholder = 'Paste your JSON here...',
  error,
  label,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Configure JSON validation
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [],
      enableSchemaRequest: false,
    });
  };

  useEffect(() => {
    // Update editor markers for errors
    if (editorRef.current && error) {
      const model = editorRef.current.getModel();
      if (model) {
        const markers: monaco.editor.IMarkerData[] = [];
        try {
          // Try to find the error line if possible
          const lines = model.getLinesContent();
          lines.forEach((line, index) => {
            if (error.toLowerCase().includes(`line ${index + 1}`) || 
                error.toLowerCase().includes(`position ${index + 1}`)) {
              markers.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: index + 1,
                startColumn: 1,
                endLineNumber: index + 1,
                endColumn: line.length + 1,
                message: error,
              });
            }
          });
          
          // If no specific line found, mark the entire document
          if (markers.length === 0 && value.trim()) {
            markers.push({
              severity: monaco.MarkerSeverity.Error,
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: model.getLineCount(),
              endColumn: model.getLineMaxColumn(model.getLineCount()),
              message: error,
            });
          }
        } catch {
          // If parsing fails, just mark the whole document
          if (model) {
            markers.push({
              severity: monaco.MarkerSeverity.Error,
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: model.getLineCount(),
              endColumn: model.getLineMaxColumn(model.getLineCount()),
              message: error,
            });
          }
        }
        
        monaco.editor.setModelMarkers(model, 'json-validation', markers);
      }
    } else if (editorRef.current && !error) {
      // Clear markers when there's no error
      const model = editorRef.current.getModel();
      if (model) {
        monaco.editor.setModelMarkers(model, 'json-validation', []);
      }
    }
  }, [error, value]);

  return (
    <div className="flex flex-col h-full">
      <label className="text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <div className="flex-1 relative rounded-lg overflow-hidden border border-gray-700">
        {!value && (
          <div className="absolute top-14 left-4 text-gray-500 text-sm pointer-events-none z-10">
            {placeholder}
          </div>
        )}
        <Editor
          height="100%"
          defaultLanguage="json"
          theme="vs-dark"
          value={value || ''}
          onChange={(newValue) => onChange(newValue || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            renderValidationDecorations: 'on',
          }}
        />
        {error && (
          <div className="absolute bottom-2 left-2 right-2 bg-red-900/90 text-red-200 text-xs p-2 rounded z-10 pointer-events-none">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

