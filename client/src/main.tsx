import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker, addResourceHints, preloadCriticalResources } from './lib/service-worker'
import { offlineStorage } from './lib/offline'

// Initialize offline storage
offlineStorage.init().catch(console.error)

// Add resource hints for better loading performance
addResourceHints()

// Preload critical resources
preloadCriticalResources([
  '/manifest.json',
  '/offline.html',
])

// Register service worker for offline functionality
registerServiceWorker().then((registration) => {
  if (registration) {
    console.log('Service Worker registered successfully')
  }
}).catch(console.error)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      // Add offline support to React Query
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations when back online
      networkMode: 'offlineFirst',
      retry: 3,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)