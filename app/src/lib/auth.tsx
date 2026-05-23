import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { startAutoSync, stopAutoSync } from './sync'
import { api } from './worker'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  isOnline: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'))
  const [isOnline, setIsOnline] = useState(navigator.onLine)

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
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({ id: payload.sub, email: payload.email })
        if (isOnline) startAutoSync()
      } catch {
        localStorage.removeItem('auth_token')
      }
    } else {
      stopAutoSync()
    }
    return () => stopAutoSync()
  }, [token, isOnline])

  const login = async (email: string, password: string) => {
    const data = await api.auth.login(email, password)
    localStorage.setItem('auth_token', data.token)
    setToken(data.token)
  }

  const register = async (email: string, password: string) => {
    const data = await api.auth.register(email, password)
    localStorage.setItem('auth_token', data.token)
    setToken(data.token)
  }

  const logout = () => {
    stopAutoSync()
    localStorage.removeItem('auth_token')
    setToken(null)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, token, login, register, logout, isOnline }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
