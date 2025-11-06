'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'ADMIN' | 'SO_ASSET_USER' | 'VIEWER'
  allowedRoles?: ('ADMIN' | 'SO_ASSET_USER' | 'VIEWER')[]
  fallbackPath?: string
}

export default function ProtectedRoute({
  children,
  requiredRole,
  allowedRoles,
  fallbackPath = '/login'
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If still loading, do nothing
    if (loading) return

    // If no user, redirect to login
    if (!user) {
      router.push(fallbackPath)
      return
    }

    // If specific role is required, check it
    if (requiredRole && user.role !== requiredRole) {
      router.push('/unauthorized')
      return
    }

    // If allowed roles are specified, check if user role is in the list
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.push('/unauthorized')
      return
    }
  }, [user, loading, router, requiredRole, fallbackPath])

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If no user, show nothing (will redirect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Redirecting to login...
      </div>
    )
  }

  // If role doesn't match, show nothing (will redirect)
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Checking access...
      </div>
    )
  }

  // If allowed roles are specified and user role is not in the list, show nothing (will redirect)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Checking access...
      </div>
    )
  }

  return <>{children}</>
}
