'use client'

import Dashboard from '@/components/features/dashboard/dashboard'
import ProtectedRoute from '@/components/protected-route'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Dashboard />
      </div>
    </ProtectedRoute>
  )
}
