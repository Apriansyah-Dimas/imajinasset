const TOKEN_KEY = 'auth_token'
const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60

const isBrowser = () => typeof window !== 'undefined'

export const getClientAuthToken = (): string | null => {
  if (isBrowser()) {
    try {
      const stored = window.localStorage?.getItem(TOKEN_KEY)
      if (stored) return stored
    } catch (error) {
      console.warn('[client-auth] Failed to read token from localStorage:', error)
    }
  }

  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`))
    if (match) {
      try {
        return decodeURIComponent(match[1])
      } catch {
        return match[1]
      }
    }
  }

  return null
}

export const setClientAuthToken = (token: string) => {
  if (!token) return

  console.log('[client-auth] Setting auth token...')

  if (isBrowser()) {
    try {
      window.localStorage?.setItem(TOKEN_KEY, token)
      console.log('[client-auth] Token stored in localStorage')
    } catch (error) {
      console.warn('[client-auth] Failed to persist token in localStorage:', error)
    }
  }

  if (typeof document !== 'undefined') {
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 7) // 7 days from now
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax; secure`
    console.log('[client-auth] Token stored in cookie with expiry:', expiryDate.toUTCString())
  }
}

export const clearClientAuthToken = () => {
  if (isBrowser()) {
    try {
      window.localStorage?.removeItem(TOKEN_KEY)
    } catch (error) {
      console.warn('[client-auth] Failed to remove token from localStorage:', error)
    }
  }

  if (typeof document !== 'undefined') {
    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
  }
}
