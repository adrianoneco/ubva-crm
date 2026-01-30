const CACHE_NAME = 'ubva-crm-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Install event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching essential files')
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('[Service Worker] Failed to cache some files:', err)
        return Promise.resolve()
      })
    })
  )
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
          return Promise.resolve()
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip API requests (let them go directly to network)
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache API responses
          return response
        })
        .catch(() => {
          // Return offline response if API fails
          return new Response(
            JSON.stringify({ error: 'Offline: Unable to reach server' }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'application/json',
              }),
            }
          )
        })
    )
    return
  }

  // For other requests, try network first, then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Don't cache non-success responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response
        }

        // Clone the response
        const responseToCache = response.clone()

        // Cache successful responses
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache).catch((err) => {
            console.warn('[Service Worker] Failed to cache response:', err)
          })
        })

        return response
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }

          // Return offline page or error
          if (request.destination === 'document') {
            return caches.match('/index.html')
          }

          return new Response('Offline: Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
          })
        })
      })
  )
})

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  // Clear cache on demand
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName)
      })
    })
    event.ports[0].postMessage({ success: true })
  }

  // Refresh data on demand (used with pull-to-refresh)
  if (event.data && event.data.type === 'REFRESH_DATA') {
    // Notify client that refresh is in progress
    event.ports[0].postMessage({ status: 'refreshing' })
  }
})

// Periodic background sync (for data sync when online)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'sync-data') {
      console.log('[Service Worker] Periodic sync triggered')
      // Implement your periodic sync logic here
    }
  })
}

console.log('✅ Service Worker loaded and ready')
