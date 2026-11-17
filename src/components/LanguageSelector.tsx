import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { LOCALE_NAMES, SUPPORTED_LOCALES, DEFAULT_LOCALE, isLocale, type Locale } from '../i18n-config';

interface LanguageSelectorProps {
  /**
   * Currently active locale. When provided the selector is fully controlled by
   * the parent (e.g. Header derives it from the URL `/:locale` segment).
   */
  currentLocale?: Locale;
  /**
   * Called with the chosen locale. The parent owns the side effects
   * (persistence + locale-prefixed navigation).
   */
  onSelect: (locale: Locale) => void;
  /** Visible label rendered before the dropdown. Defaults to a localized "Language". */
  label?: string;
  id?: string;
  className?: string;
}

/**
 * Accessible language picker (native <select>) that lists every supported
 * locale using its native name (English, Português, 中文, Español).
 *
 * Responsibilities are intentionally minimal and presentational: the parent
 * supplies the active locale and reacts to `onSelect`. Persistence and URL
 * routing live in the calling component (Header) so this stays trivially
 * testable.
 */
export function LanguageSelector({
  currentLocale,
  onSelect,
  label,
  id = 'language-selector',
  className,
}: LanguageSelectorProps) {
  const { t } = useTranslation();
  // Controlled when a currentLocale is supplied; otherwise fall back to what
  // react-i18next currently has resolved.
  const activeLocale: Locale =
    currentLocale && isLocale(currentLocale)
      ? currentLocale
      : (isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as Locale;
    if (!isLocale(next)) return;
    onSelect(next);
  };

  return (
    <label
      className={`site-language${className ? ` ${className}` : ''}`}
    >
      <span>{label ?? t('app.language')}</span>
      <select
        id={id}
        value={activeLocale}
        onChange={handleChange}
        aria-label={label ?? t('app.language')}
      >
        {SUPPORTED_LOCALES.map((lng) => (
          <option key={lng} value={lng}>
            {LOCALE_NAMES[lng]}
          </option>
        ))}
      </select>
    </label>
  );
}
