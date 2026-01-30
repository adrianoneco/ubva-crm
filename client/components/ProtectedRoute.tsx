import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation()
  const userStr = localStorage.getItem('user')
  
  // If not logged in, redirect to login
  if (!userStr) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  
  try {
    const user = JSON.parse(userStr)
    
    // If no specific roles required, just check if logged in
    if (!allowedRoles || allowedRoles.length === 0) {
      return <>{children}</>
    }
    
    // Check if user has one of the allowed roles
    if (user.role && allowedRoles.includes(user.role)) {
      return <>{children}</>
    }
    
    // User doesn't have permission - redirect to dashboard
    return <Navigate to="/" replace />
  } catch {
    // Invalid user data, redirect to login
    localStorage.removeItem('user')
    return <Navigate to="/login" state={{ from: location }} replace />
  }
}
