import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { gtag } from '../services/analytics';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  label: string;
  side?: 'left' | 'right';
}

export const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  placeholder = 'Paste or drag your JSON here...',
  error,
  label,
  side,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    
    // Configure JSON validation
    monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [],
      enableSchemaRequest: false,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const isValidJsonFile = 
      file.type === 'application/json' || 
      file.name.toLowerCase().endsWith('.json') ||
      file.type === 'text/plain' && file.name.toLowerCase().endsWith('.json');

    if (!isValidJsonFile) {
      gtag('event', 'drag_drop_invalid_file', { 
        side: side || 'unknown',
        file_type: file.type,
        file_name: file.name
      });
      return; // Silently ignore non-JSON files
    }

    try {
      const text = await file.text();
      
      // Set the raw text exactly as it was in the file, without formatting
      onChange(text);
      gtag('event', 'drag_drop_success', { 
        side: side || 'unknown',
        file_size: file.size,
        formatted: false
      });
    } catch (readError) {
      // Silently ignore read errors
      console.error('Error reading file:', readError);
    }
  };

  useEffect(() => {
    // Update editor markers for errors
    if (editorRef.current && error && monacoRef.current) {
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
                severity: monacoRef.current!.MarkerSeverity.Error,
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
              severity: monacoRef.current!.MarkerSeverity.Error,
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
              severity: monacoRef.current!.MarkerSeverity.Error,
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: model.getLineCount(),
              endColumn: model.getLineMaxColumn(model.getLineCount()),
              message: error,
            });
          }
        }
        
        monacoRef.current!.editor.setModelMarkers(model, 'json-validation', markers);
      }
    } else if (editorRef.current && !error && monacoRef.current) {
      // Clear markers when there's no error
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current!.editor.setModelMarkers(model, 'json-validation', []);
      }
    }
  }, [error, value]);

  return (
    <div className="flex flex-col h-full">
      <label className="text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <div 
        className={`flex-1 relative rounded-lg overflow-hidden border transition-colors ${
          isDragging 
            ? 'border-blue-500 border-2 bg-blue-500/10' 
            : 'border-gray-700'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
          loading={
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="animate-pulse">Loading editor...</div>
            </div>
          }
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

