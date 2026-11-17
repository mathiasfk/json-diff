import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { localeFromPath } from './site';
import en from './locales/en.json';
import pt from './locales/pt.json';
import zh from './locales/zh.json';
import es from './locales/es.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
      zh: { translation: zh },
      es: { translation: es },
    },
    lng: typeof window === 'undefined' ? 'en' : localeFromPath(window.location.pathname.slice(import.meta.env.BASE_URL.length - 1)),
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    returnObjects: true,
    interpolation: { escapeValue: false }, // React escapes interpolated text when rendering.
    react: {
      useSuspense: false,
    },
  });

export default i18n;
