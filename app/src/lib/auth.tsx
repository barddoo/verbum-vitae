import { createContext, type ReactNode, use, useEffect, useMemo, useState } from 'react'
import { cachedRemove, cachedSet } from './storage'
import { api } from './worker'

interface User {
  id: string
  email: string
  displayName: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  updateDisplayName: (name: string) => Promise<void>
  isOnline: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'))
  const [displayName, setDisplayName] = useState<string | null>(() => localStorage.getItem('auth_display_name'))
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const user = useMemo<User | null>(() => {
    if (!token) return null
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return { id: payload.sub, email: payload.email, displayName }
    } catch {
      return null
    }
  }, [token, displayName])

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    if (token && !user) {
      cachedRemove('auth_token')
      setToken(null)
    }
  }, [token, user])

  const login = async (email: string, password: string) => {
    const data = await api.auth.login(email, password)
    cachedSet('auth_token', data.token)
    const dn = data.user?.displayName ?? null
    if (dn) localStorage.setItem('auth_display_name', dn)
    setToken(data.token)
    setDisplayName(dn)
  }

  const register = async (email: string, password: string) => {
    const data = await api.auth.register(email, password)
    cachedSet('auth_token', data.token)
    setToken(data.token)
    setDisplayName(null)
  }

  const logout = () => {
    cachedRemove('auth_token')
    localStorage.removeItem('auth_display_name')
    setToken(null)
    setDisplayName(null)
  }

  const updateDisplayName = async (name: string) => {
    await api.leaderboard.updateProfile(name)
    localStorage.setItem('auth_display_name', name)
    setDisplayName(name)
  }

  const value = useMemo(
    () => ({ user, token, login, register, logout, updateDisplayName, isOnline }),
    [user, token, login, register, logout, updateDisplayName, isOnline],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
