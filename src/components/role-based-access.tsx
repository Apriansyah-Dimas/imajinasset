'use client'

import { useAuth } from '@/contexts/auth-context'

interface RoleBasedAccessProps {
  children: React.ReactNode
  allowedRoles: ('ADMIN' | 'SO_ASSET_USER' | 'VIEWER' | 'USER')[]
  fallback?: React.ReactNode
}

export default function RoleBasedAccess({
  children,
  allowedRoles,
  fallback = null
}: RoleBasedAccessProps) {
  const { user } = useAuth()

  // If no user, show fallback
  if (!user) {
    return <>{fallback}</>
  }

  // If user role is in allowed roles, show children
  if (allowedRoles.includes(user.role)) {
    return <>{children}</>
  }

  // Otherwise show fallback
  return <>{fallback}</>
}
