import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import './index.css'

const Faq = React.lazy(() => import('./pages/Faq'))

// Disable StrictMode in production to reduce TBT
const isProduction = import.meta.env.PROD
const AppWrapper = ({ children }: { children: React.ReactNode }) =>
  isProduction ? <>{children}</> : <React.StrictMode>{children}</React.StrictMode>

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppWrapper>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route 
          path="/faq" 
          element={
            <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-300">Loading...</div>}>
              <Faq />
            </React.Suspense>
          } 
        />
      </Routes>
    </HashRouter>
  </AppWrapper>
)

