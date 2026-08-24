import { SUPPORTED_FORMATS, type Format } from '../utils/formatSelector';
import { useTranslation } from 'react-i18next';

interface FormatSelectorProps {
  value: Format;
  onChange: (format: Format) => void;
  /** Visible text label rendered before the dropdown (e.g. "Format"). */
  label?: string;
  /** id for the underlying <select>, used to associate external <label htmlFor>. */
  id?: string;
}

/**
 * Dropdown that lets the user pick the serialization format for one side of the
 * diff input: JSON, JSONL or YAML. JSON is the default format.
 */
export function FormatSelector({ value, onChange, label, id }: FormatSelectorProps) {
  const { t } = useTranslation();
  return (
    <label className="flex items-center gap-2 text-xs text-gray-400">
      {label && <span>{label}</span>}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as Format)}
        className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label={label ? t('formatSelector.ariaWithLabel', { label }) : t('formatSelector.ariaDefault')}
      >
        {SUPPORTED_FORMATS.map((f) => (
          <option key={f} value={f}>
            {f.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
