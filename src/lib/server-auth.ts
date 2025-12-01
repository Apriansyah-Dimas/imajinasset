import 'server-only'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

type UserRole = 'ADMIN' | 'SO_ASSET_USER' | 'VIEWER'

type AuthResult =
  | { isAuthenticated: false }
  | {
      isAuthenticated: true
      user: {
        id: string
        email: string
        name: string
        role: UserRole
      }
    }

export async function getServerAuth(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return { isAuthenticated: false }
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      userId?: string
      email?: string
      name?: string
      role?: UserRole
    } | undefined

    if (!decoded?.userId || !decoded.role || !decoded.email) {
      return { isAuthenticated: false }
    }

    return {
      isAuthenticated: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name ?? '',
        role: decoded.role
      }
    }
  } catch (error) {
    console.error('[server-auth] Failed to verify token', error)
    return { isAuthenticated: false }
  }
}
