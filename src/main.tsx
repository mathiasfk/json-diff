import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import Faq from './pages/Faq'
import { LocaleLayout } from './LocaleLayout'
import { DEFAULT_LOCALE, detectInitialLocale } from './i18n-config'
import './index.css'
import './i18n' // Ensure i18n is initialized

// Disable StrictMode in production to reduce TBT
const isProduction = import.meta.env.PROD
// eslint-disable-next-line react-refresh/only-export-components
const AppWrapper = ({ children }: { children: React.ReactNode }) =>
  isProduction ? <>{children}</> : <React.StrictMode>{children}</React.StrictMode>

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppWrapper>
    <HashRouter>
      <Routes>
        {/* Redirect the bare root to the detected/initial locale route. */}
        <Route
          path="/"
          element={<Navigate to={`/${detectInitialLocale()}`} replace />}
        />
        {/* Locale-prefixed routes. LocaleLayout validates the locale segment. */}
        <Route path="/:locale" element={<LocaleLayout><App /></LocaleLayout>} />
        <Route
          path="/:locale/faq"
          element={
            <LocaleLayout>
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-300">Loading...</div>}>
                <Faq />
              </React.Suspense>
            </LocaleLayout>
          }
        />
        {/* Fallback: unknown paths go to the default-locale home. */}
        <Route path="*" element={<Navigate to={`/${DEFAULT_LOCALE}`} replace />} />
      </Routes>
    </HashRouter>
  </AppWrapper>
)
