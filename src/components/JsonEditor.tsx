import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { gtag } from '../services/analytics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { FormatSelector } from './FormatSelector';
import type { Format } from '../utils/formatSelector';
import { detectFormatFromFilename, detectInputFormat } from '../utils/formatSelector';
import { registerJsonlLanguage } from './jsonlLanguage';
import { validateJsonlLines } from '../utils/jsonlValidation';

/** Map a diff-input format to a Monaco editor language id (when supported). */
const MONACO_LANGUAGE: Record<Format, string> = {
  json: 'json',
  jsonl: 'jsonl',
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
  onFormat?: () => void;
  onClear?: () => void;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  format,
  onFormatChange,
  placeholder,
  error,
  label,
  side,
  onFormat,
  onClear,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mountedEditor, setMountedEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const pasteListenerRef = useRef<monaco.IDisposable | null>(null);
  const modelListenerRef = useRef<monaco.IDisposable | null>(null);
  const [modelVersion, setModelVersion] = useState(0);

  // Keep the latest onFormatChange in a ref so the Monaco paste listener
  // (registered once on mount) always calls the current callback.
  const onFormatChangeRef = useRef(onFormatChange);
  onFormatChangeRef.current = onFormatChange;

  /** When the user pastes recognizable content, auto-select the matching format. */
  const detectAndApplyFormat = (pasted: string) => {
    if (!pasted || !pasted.trim()) return;
    const { format } = detectInputFormat(pasted);
    // Only the 3 supported formats are selectable; unrecognized content keeps the current format.
    if (format === 'json' || format === 'jsonl' || format === 'yaml') {
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
    pasteListenerRef.current?.dispose();
    pasteListenerRef.current = editor.onDidPaste((e: { range: monaco.IRange }) => {
      const model = editor.getModel();
      if (!model) return;
      const pasted = model.getValueInRange(e.range);
      detectAndApplyFormat(pasted);
    });

    // Register the dedicated JSONL language (single-line JSON highlighting,
    // no formatting / no auto-indent). Idempotent — safe to call per mount.
    registerJsonlLanguage(monacoInstance);

    // JSON diagnostics are global to Monaco, not scoped to an editor.
    monacoInstance.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [],
      enableSchemaRequest: false,
    });
    modelListenerRef.current?.dispose();
    modelListenerRef.current = editor.onDidChangeModel(() => setModelVersion(version => version + 1));
    setMountedEditor(editor);
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

  const loadFile = async (file: File, source: 'drop' | 'picker') => {
    setFileError(null);
    const detected = detectFormatFromFilename(file.name);
    const accepted = detected !== 'json' || file.type === 'application/json' ||
      file.type === 'text/plain' || /\.(json|jsonl|ndjson|yml|yaml)$/i.test(file.name);

    if (!accepted) {
      setFileError(t('jsonEditor.fileInvalid'));
      if (source === 'drop') {
        gtag('event', 'drag_drop_invalid_file', {
          side: side || 'unknown', file_type: file.type, file_name: file.name,
        });
      }
      return;
    }

    if (source === 'picker' && value.trim() && !window.confirm(t('jsonEditor.replaceWithFile'))) return;

    try {
      const text = await file.text();
      onChange(text);
      onFormatChange(detected);
      gtag('event', source === 'drop' ? 'drag_drop_success' : 'file_load_success', {
        side: side || 'unknown', file_size: file.size, detected_format: detected, formatted: false,
      });
    } catch {
      setFileError(t('jsonEditor.fileReadError'));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void loadFile(file, 'drop');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clearing the input allows selecting the same file again, including after cancellation.
    e.target.value = '';
    if (file) void loadFile(file, 'picker');
  };

  useEffect(() => {
    const model = mountedEditor?.getModel();
    const instance = monacoRef.current;
    if (!model || !instance) return;

    const jsonlMarkers: monaco.editor.IMarkerData[] = format === 'jsonl'
      ? validateJsonlLines(value).map((err) => ({
          severity: instance.MarkerSeverity.Error,
          startLineNumber: err.lineNumber,
          startColumn: 1,
          endLineNumber: err.lineNumber,
          endColumn: model.getLineMaxColumn(err.lineNumber),
          message: t('editor.invalidJsonl', { line: err.lineNumber, message: err.message }),
        }))
      : [];
    const errorMarkers: monaco.editor.IMarkerData[] = format !== 'jsonl' && error && value.trim()
      ? [{
          severity: instance.MarkerSeverity.Error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: model.getLineCount(),
          endColumn: model.getLineMaxColumn(model.getLineCount()),
          message: error,
        }]
      : [];
    instance.editor.setModelMarkers(model, 'jsonl-validation', jsonlMarkers);
    instance.editor.setModelMarkers(model, 'json-validation', errorMarkers);
    return () => {
      if (!model.isDisposed()) {
        instance.editor.setModelMarkers(model, 'jsonl-validation', []);
        instance.editor.setModelMarkers(model, 'json-validation', []);
      }
    };
  }, [mountedEditor, modelVersion, error, value, format, t]);

  useEffect(() => () => {
    pasteListenerRef.current?.dispose();
    modelListenerRef.current?.dispose();
  }, []);

  // Keep the no-pretty-print options in sync when the format toggles at runtime,
  // since `options` prop changes alone aren't always applied live.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.updateOptions({
      formatOnPaste: format !== 'jsonl',
      formatOnType: format !== 'jsonl',
      autoIndent: format === 'jsonl' ? 'none' : 'advanced',
    });
  }, [format, mountedEditor]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-gray-800 border border-gray-700 border-b-0 rounded-t-md">
        <div className="flex flex-1 min-w-[14rem] items-center justify-between gap-3">
          <span className="text-sm font-medium text-gray-200">{label}</span>
          <FormatSelector value={format} onChange={onFormatChange} label={t('jsonEditor.formatLabel')} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".json,.jsonl,.ndjson,.yaml,.yml,application/json,text/plain" onChange={handleFileChange} className="hidden" tabIndex={-1} aria-hidden="true" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="editor-action" aria-label={t(side === 'left' ? 'jsonEditor.loadLeft' : 'jsonEditor.loadRight')}>{t('jsonEditor.load')}</button>
          {onFormat && <button type="button" onClick={onFormat} disabled={!value.trim()} className="editor-action" aria-label={t(side === 'left' ? 'jsonEditor.formatLeft' : 'jsonEditor.formatRight')}>{t('app.format')}</button>}
          {onClear && <button type="button" onClick={onClear} disabled={!value.trim()} className="editor-action" aria-label={t(side === 'left' ? 'jsonEditor.clearLeft' : 'jsonEditor.clearRight')}>{t('app.clear')}</button>}
        </div>
      </div>
      <div
        className={`flex-1 min-h-0 relative rounded-b-md overflow-hidden border transition-colors ${
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
            {placeholder ?? t('jsonEditor.placeholder')}
          </div>
        )}
        <Editor
          height="100%"
          language={MONACO_LANGUAGE[format]}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={value || ''}
          onChange={(newValue) => onChange(newValue || '')}
          onMount={handleEditorDidMount}
          loading={
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="animate-pulse">{t('jsonEditor.loading')}</div>
            </div>
          }
          options={{
            ariaLabel: label,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            // For JSONL, never pretty-print. Disabling formatOnPaste/Type keeps a
            // pasted multi-line JSON object from being reformatted into a single
            // line, and with no formatter registered (jsonlLanguage.ts) the
            // Format Document action is a no-op. `autoIndent` is off so Enter
            // just inserts a newline instead of re-indenting a JSON value.
            formatOnPaste: format !== 'jsonl',
            formatOnType: format !== 'jsonl',
            autoIndent: format === 'jsonl' ? 'none' : 'advanced',
            renderValidationDecorations: 'on',
          }}
        />
        {(error || fileError) && (
          <div role="alert" className="absolute bottom-2 left-2 right-2 bg-red-900/90 text-red-200 text-xs p-2 rounded z-10 pointer-events-none">
            {fileError || error}
          </div>
        )}
      </div>
    </div>
  );
};
