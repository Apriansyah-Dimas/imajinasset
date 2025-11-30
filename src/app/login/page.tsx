import { getServerAuth } from '@/lib/server-auth'
import { redirect } from 'next/navigation'
import LoginClient from './login-client'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const auth = await getServerAuth()

  if (auth.isAuthenticated) {
    redirect('/')
  }

  return <LoginClient />
}
