/**
 * Global error handler for HTTP/API errors
 * Intercepts failed requests and can navigate to error pages
 */

let errorCallback: ((code: string) => void) | null = null

export function setErrorCallback(callback: (code: string) => void) {
  errorCallback = callback
}

/**
 * Wraps fetch to handle HTTP errors
 */
export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(url, options)

    // Handle various HTTP error codes
    if (!response.ok) {
      const errorCode = response.status.toString()
      
      // Log the error
      console.error(`[HTTP ${errorCode}] ${response.statusText} - ${url}`)
      
      // Trigger error callback for 4xx and 5xx errors
      if (errorCode.startsWith('4') || errorCode.startsWith('5')) {
        errorCallback?.(errorCode)
      }

      // Check for specific error codes
      if (response.status === 401) {
        // Unauthorized - clear auth and redirect to login
        localStorage.removeItem('user')
        localStorage.removeItem('authToken')
        window.location.href = '/login'
        throw new Error('Unauthorized')
      } else if (response.status === 403) {
        // Forbidden
        throw new Error('Access denied')
      } else if (response.status === 404) {
        // Not found
        throw new Error('Resource not found')
      } else if (response.status === 500) {
        // Server error
        throw new Error('Server error')
      } else if (response.status === 503) {
        // Service unavailable
        throw new Error('Service unavailable')
      }
    }

    return response
  } catch (error) {
    console.error('[Fetch Error]', error)
    throw error
  }
}

/**
 * Initialize global error handling
 */
export function initializeErrorHandling() {
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Rejection]', event.reason)
    
    if (event.reason?.message?.includes('Failed to fetch')) {
      errorCallback?.('offline')
    }
  })

  // Catch uncaught errors
  window.addEventListener('error', (event) => {
    console.error('[Uncaught Error]', event.error)
  })

  // Monitor for network issues
  window.addEventListener('offline', () => {
    console.warn('Network connection lost')
    errorCallback?.('offline')
  })

  window.addEventListener('online', () => {
    console.log('Network connection restored')
  })
}
