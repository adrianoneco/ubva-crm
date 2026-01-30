import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { initializeErrorHandling } from './utils/errorHandler'

// Initialize global error handling
initializeErrorHandling()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully')
        
        // Check for updates periodically
        setInterval(() => {
          registration.update()
        }, 60000) // Check every minute
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error)
      })
  })

  // Handle Service Worker updates
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🔄 Service Worker updated, app will reload on next refresh')
  })
}

// Force landscape orientation on mobile devices
if (screen.orientation && (screen.orientation as any).lock) {
  (screen.orientation as any)
    .lock('landscape')
    .catch((err: any) => {
      console.warn('Could not lock orientation to landscape:', err)
    })
}

