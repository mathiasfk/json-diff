import { redirectToSupport } from './bootstrap-url'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './theme'
import App from './App'
import { LocaleLayout } from './LocaleLayout'
import './i18n'
import './index.css'

if (!redirectToSupport) {
  const content = <ThemeProvider><BrowserRouter basename={import.meta.env.BASE_URL}>
    <LocaleLayout><App /></LocaleLayout>
  </BrowserRouter></ThemeProvider>
  ReactDOM.createRoot(document.getElementById('root')!).render(
    import.meta.env.PROD ? content : <React.StrictMode>{content}</React.StrictMode>
  )
}
