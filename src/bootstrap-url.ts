import { normalizeLegacyUrl } from './site';

// This module must be evaluated before i18n and analytics initialize. Keeping
// normalization in the first dependency allows one eagerly loaded app bundle.
const normalized = normalizeLegacyUrl(new URL(window.location.href), import.meta.env.BASE_URL);
export const redirectToSupport = normalized.href !== window.location.href && /\/faq\/$/.test(normalized.pathname);

if (redirectToSupport) window.location.replace(normalized.href);
else if (normalized.href !== window.location.href) window.history.replaceState(window.history.state, '', normalized.href);
