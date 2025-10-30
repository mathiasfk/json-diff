import React from 'react';

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
  return (
    <div className="flex flex-col h-full">
      <label className="text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <div className="flex-1 relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-full p-4 bg-gray-800 text-gray-100 font-mono text-sm rounded-lg resize-none focus:outline-none focus:ring-2 ${
            error
              ? 'border-2 border-red-500 focus:ring-red-500'
              : 'border border-gray-700 focus:ring-blue-500'
          }`}
          spellCheck={false}
        />
        {error && (
          <div className="absolute bottom-2 left-2 right-2 bg-red-900/90 text-red-200 text-xs p-2 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

