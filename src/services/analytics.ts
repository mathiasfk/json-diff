/* Google Analytics (GA4) helper with dev-safe no-op logging */

export const GA_MEASUREMENT_ID = 'G-1WMV847FRL' as const;

const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0'
);

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize globals safely
if (isBrowser) {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = (...args: any[]) => {
      // Queue arguments until GA script is loaded
      window.dataLayer.push(args);
    };
  }
}

// Load GA script and configure only outside localhost
if (isBrowser && !isLocalhost) {
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.async = true;
  script.onload = () => {
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);
  };
  document.head.appendChild(script);
}

const sendGtag = (...args: any[]): void => {
  if (!isBrowser) return;

  if (isLocalhost) {
    console.log('📊 Analytics (dev):', ...args);
    return;
  }

  if (typeof window.gtag === 'function') {
    window.gtag(...args);
  } else {
    window.dataLayer.push(args);
  }
};

// Flexible event helper
export function trackEvent(name: string, params?: any): void {
  sendGtag('event', name, params);
}


