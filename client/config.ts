// Get API URL based on the current environment
export const getApiUrl = (): string => {
  // Get the current window location
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  
  // In development, backend runs on port 3001
  // In production, same origin is used
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:3001`
  }
  
  // For IP addresses or domains, use the same origin
  return window.location.origin
}

export const API_URL = getApiUrl()
