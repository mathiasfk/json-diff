# i18n Analysis for Smart JSON Diff

## Chosen i18n Library
The project uses **react-i18next** with the following dependencies:
- `i18next`: Core internationalization framework
- `react-i18next`: React bindings for i18next
- `i18next-browser-languagedetector`: Detects user's language from browser settings

## File Structure
Locale files are stored in `src/locales/` with separate JSON files for each supported language:
- `en.json`: English (default)
- `pt.json`: Portuguese
- `zh.json`: Chinese
- `es.json`: Spanish

Each file contains a flat JSON structure with translation keys and values.

Example structure (`src/locales/en.json`):
```json
{
  "app.title": "Smart JSON Diff"
}
```

## Routing Strategy
The application uses **react-router HashRouter** (as noted in project documentation), which means:
- Only the root path `/` is a real indexable URL for SEO purposes
- Other views like `/faq` are hash routes (e.g., `#/faq`) and are not independently crawlable by search engines
- Language changes happen entirely on the client-side without changing the URL path
- The current implementation does not implement language-specific routes (e.g., `/en/`, `/pt/`)

## Constraints Identified
1. **SEO Limitations**: Due to HashRouter usage, language-specific content is not easily indexable by search engines as separate URLs
2. **Client-Side Only**: All i18n processing happens in the browser; there is no server-side rendering or pre-rendering for different languages
3. **Storage Mechanism**: Language preference is stored in `localStorage` with detection order: `['localStorage', 'navigator']`
4. **Fallback Language**: English (`en`) is configured as the fallback language
5. **Development Debugging**: Debug mode is enabled only in development (`import.meta.env.DEV`)

## Implementation Status
Based on code inspection, the following i18n features have already been implemented:
- [x] i18n dependencies installed
- [x] Locale file structure created (`src/locales/` with language files)
- [x] i18n initialization (`src/i18n.ts`)
- [x] Language selector in UI (Header component)
- [x] Automatic language detection from browser/navigator
- [x] Language persistence via localStorage
- [x] Fallback to English when unsupported language detected
- [x] Analytics event triggered on language change (in Header)

## Next Steps for Full Implementation
To complete i18n support for all languages, the following work remains:
1. Extract all hardcoded strings from UI components and replace with `t()` calls
2. Add translation keys and values to all locale files
3. Ensure FAQ component uses translation function
4. Consider SEO enhancements (though limited by HashRouter constraints)
5. Comprehensive testing of language switching and state preservation