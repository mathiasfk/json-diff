import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import './index.css'

const Faq = React.lazy(() => import('./pages/Faq'))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
  </React.StrictMode>,
)

