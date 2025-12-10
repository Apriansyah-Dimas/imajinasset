'use client'

import Dashboard from '@/components/dashboard'
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
