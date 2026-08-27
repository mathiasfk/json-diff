# I18n Implementation Checklist

## Summary of Analysis

Based on I18n-Analysis.md:

### Chosen i18n Library
The project uses **react-i18next** with the following dependencies:
- `i18next`: Core internationalization framework
- `react-i18next`: React bindings for i18next
- `i18next-browser-languagedetector`: Detects user's language from browser settings

### File Structure
Locale files are stored in `src/locales/` with separate JSON files for each supported language:
- `en.json`: English (default)
- `pt.json`: Portuguese
- `zh.json`: Chinese
- `es.json`: Spanish
Each file contains a flat JSON structure with translation keys and values.

### Routing Strategy
The application uses **react-router HashRouter**, which means:
- Only the root path `/` is a real indexable URL for SEO purposes
- Other views like `/faq` are hash routes (e.g., `#/faq`) and are not independently crawlable by search engines
- Language changes happen entirely on the client-side without changing the URL path
- The current implementation does not implement language-specific routes (e.g., `/en/`, `/pt/`)

### Constraints Identified
1. **SEO Limitations**: Due to HashRouter usage, language-specific content is not easily indexable by search engines as separate URLs
2. **Client-Side Only**: All i18n processing happens in the browser; there is no server-side rendering or pre-rendering for different languages
3. **Storage Mechanism**: Language preference is stored in `localStorage` with detection order: `['localStorage', 'navigator']`
4. **Fallback Language**: English (`en`) is configured as the fallback language
5. **Development Debugging**: Debug mode is enabled only in development (`import.meta.env.DEV`)

### Implementation Status
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

### 1. Extract UI Strings for Translation
- [ ] Identify all hardcoded strings in the UI components
- [ ] Replace hardcoded strings with `t()` calls using appropriate translation keys
- [ ] Add the translation keys and default English values to `src/locales/en.json`
- [ ] Translate the keys to pt, zh, es in their respective files

**Components to check:**
- Header (already partially done)
- FormatSelector
- DiffViewer
- JsonEditor
- Any modals, tooltips, or popups
- Footer (if exists)
- FAQ component

### 2. Update FAQ Component
- [ ] Ensure FAQ uses the translation function (`t()`) for questions and answers
- [ ] Verify that the FAQ component updates when language changes
- [ ] Add FAQ content to locale files (if not already)

### 3. SEO Enhancements (Recommended but optional for initial release)
- [ ] Add dynamic meta tags (title, description, Open Graph) using react-helmet or equivalent
- [ ] Update meta tags based on current language and page
- [ ] Generate sitemap.xml that includes language-specific routes (if using static rendering)
- [ ] Add hreflang tags to the HTML head for each language version
- [ ] Consider generating static builds per language for better SEO (if HashRouter limitations are problematic)

### 4. Testing and Validation
- [ ] Test automatic language detection from navigator.language
- [ ] Test language override via the selector persists in localStorage
- [ ] Test switching languages does not lose app state (e.g., JSON editor content)
- [ ] Test fallback to English when unsupported language is detected
- [ ] Validate with Lighthouse and other SEO tools after deploy
- [ ] Check that language change triggers analytics event (already implemented in Header)

### 5. Documentation and Maintenance
- [ ] Add a comment in locale files explaining the structure and how to add new languages
- [ ] Consider adding a script to help find missing translation keys
- [ ] Update CONTRIBUTING.md if needed to guide contributors on adding translations