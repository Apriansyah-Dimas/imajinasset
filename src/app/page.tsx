'use client'

import Dashboard from '@/components/dashboard'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function Home() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Page Content - Default to Dashboard */}
        <Dashboard />
      </div>
    </ProtectedRoute>
  )
}