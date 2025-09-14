import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary' // will wrap app to catch crashes
import './index.css'

// Mount our React app inside <div id="root"> from index.html
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* ErrorBoundary makes sure user sees fallback if app crashes */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
