import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { gtag } from '../services/analytics';
import { FormatSelector } from './FormatSelector';
import type { Format } from '../utils/formatSelector';
import { detectFormatFromFilename, detectInputFormat } from '../utils/formatSelector';

/** Map a diff-input format to a Monaco editor language id (when supported). */
const MONACO_LANGUAGE: Record<Format, string> = {
  json: 'json',
  jsonl: 'json',
  yaml: 'yaml',
};

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Selected input format for this side; drives the editor language + drag detection. */
  format: Format;
  /** Called when the user changes the format via the selector. */
  onFormatChange: (format: Format) => void;
  placeholder?: string;
  error?: string;
  label: string;
  side?: 'left' | 'right';
}

export const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  format,
  onFormatChange,
  placeholder = 'Paste or drag your input here...',
  error,
  label,
  side,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Keep the latest onFormatChange in a ref so the Monaco paste listener
  // (registered once on mount) always calls the current callback.
  const onFormatChangeRef = useRef(onFormatChange);
  onFormatChangeRef.current = onFormatChange;

  /** When the user pastes recognizable content, auto-select the matching format. */
  const detectAndApplyFormat = (pasted: string) => {
    if (!pasted || !pasted.trim()) return;
    const { format } = detectInputFormat(pasted);
    // Only the 5 diff-able formats are selectable; xml/plaintext stay JSON.
    if (format === 'json' || format === 'jsonl' || format === 'yaml' ||
        format === 'csv' || format === 'tsv') {
      onFormatChangeRef.current(format);
      gtag('event', 'paste_auto_detect', {
        side: side || 'unknown',
        detected_format: format,
      });
    }
  };

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    // Auto-detect format from pasted content and switch the selector.
    editor.onDidPaste((e: { range: monaco.IRange }) => {
      const model = editor.getModel();
      if (!model) return;
      const pasted = model.getValueInRange(e.range);
      detectAndApplyFormat(pasted);
    });

    // Configure validation only for JSON-family inputs; other formats use a
    // plain text editor without schema validation.
    if (format === 'json' || format === 'jsonl') {
      monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        schemas: [],
        enableSchemaRequest: false,
      });
    } else {
      monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: false,
        schemas: [],
        enableSchemaRequest: false,
      });
    }
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

    // Detect the format from the dropped file's extension so the editor and
    // parser stay in sync with what the user actually dropped.
    const detected = detectFormatFromFilename(file.name);
    const accepted = detected !== 'json' || file.type === 'application/json' ||
      file.type === 'text/plain' || file.name.toLowerCase().endsWith('.json') ||
      file.name.toLowerCase().endsWith('.jsonl') || file.name.toLowerCase().endsWith('.ndjson') ||
      file.name.toLowerCase().endsWith('.yml') || file.name.toLowerCase().endsWith('.yaml');

    if (!accepted) {
      gtag('event', 'drag_drop_invalid_file', {
        side: side || 'unknown',
        file_type: file.type,
        file_name: file.name,
      });
      return; // Silently ignore unsupported files
    }

    try {
      const text = await file.text();

      // Set the raw text exactly as it was in the file, without formatting,
      // and switch the selector to the detected format.
      onChange(text);
      onFormatChange(detected);
      gtag('event', 'drag_drop_success', {
        side: side || 'unknown',
        file_size: file.size,
        detected_format: detected,
        formatted: false,
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
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={`${side}-editor`} className="text-sm font-medium text-gray-300">
          {label}
        </label>
        <FormatSelector
          value={format}
          onChange={onFormatChange}
          label="Format"
        />
      </div>
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
          language={MONACO_LANGUAGE[format]}
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
