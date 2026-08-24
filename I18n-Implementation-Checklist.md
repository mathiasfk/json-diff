# I18n Implementation Checklist

Based on the analysis in I18n-Analysis.md, the following steps are required to implement i18n support for English (en), Portuguese (pt), Chinese (zh), and Spanish (es).

## ✅ Completed Steps
- [x] Add i18n dependencies (i18next, react-i18next, i18next-browser-languagedetector)
- [x] Create locale file structure (`src/locales/` with en.json, pt.json, zh.json, es.json)
- [x] Set up i18n initialization (`src/i18n.ts`)
- [x] Add language selector in the UI (Header.tsx)

## 📋 Pending Steps

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
- Json2ToonCta
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
