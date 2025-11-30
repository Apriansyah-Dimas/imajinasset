import Dashboard from '@/components/dashboard'
import ProtectedRoute from '@/components/ProtectedRoute'
import { getServerAuth } from '@/lib/server-auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const auth = await getServerAuth()

  if (!auth.isAuthenticated) {
    redirect('/login')
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Dashboard />
      </div>
    </ProtectedRoute>
  )
}
