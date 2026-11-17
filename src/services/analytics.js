import { redirectToSupport } from '../bootstrap-url';
import i18n from 'i18next';
import { DEFAULT_LOCALE, isLocale } from '../i18n-config';

// Initialize Google Analytics
const GA_MEASUREMENT_ID = 'G-1WMV847FRL';
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

window.gtag = function() {
  window.dataLayer.push(arguments);
}

// Initialize dataLayer
window.dataLayer = window.dataLayer || [];

// Analytics wrapper function
export const gtag = (...args) => {
  if (args[0] === 'event') {
    const language = isLocale(i18n.resolvedLanguage)
      ? i18n.resolvedLanguage
      : isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE;
    // Read the current language for every event; explicit values (such as the
    // destination of language_change) take precedence without mutating callers.
    args[2] = { language, ...args[2] };
  }

  if (isLocalhost) {
    console.log('📊 Analytics (debug):', ...args);
    return;
  }
  
  if (typeof window.gtag === 'function') {
    window.gtag(...args);
  } else {
    console.warn('Google Analytics not loaded yet');
    window.dataLayer.push(args);
  }
};

// Initialize analytics only in production
if (!isLocalhost && !redirectToSupport) {
  // Load GA script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.async = true;
  
  // Add onload handler to ensure GA is ready
  script.onload = () => {
    // Initialize GA
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);
  };
  
  document.head.appendChild(script);
}
