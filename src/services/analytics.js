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
  if (isLocalhost) {
    console.log('📊 Analytics (debug):', ...args);
    return;
  }
  
  if (typeof window.gtag === 'function') {
    window.gtag(...args);
  } else {
    console.warn('Google Analytics not loaded yet');
    window.dataLayer.push(...args);
  }
};

// Initialize analytics only in production
if (!isLocalhost) {
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