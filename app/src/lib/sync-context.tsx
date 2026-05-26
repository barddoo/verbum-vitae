import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './auth'
import { db } from './db'
import { cachedGet } from './storage'
import { clearCursor, clearSyncStateCallback, syncNow as runSync, setSyncStateCallback, startAutoSync, stopAutoSync } from './sync'

interface SyncState {
  isSyncing: boolean
  lastSynced: number | null
  error: string | null
  pendingCount: number
}

interface SyncContextType extends SyncState {
  syncNow: () => void
  resetError: () => void
}

const SyncContext = createContext<SyncContextType | null>(null)

export function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins === 1) return '1 min'
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins > 0 ? `${hrs}h${remMins}min` : `${hrs}h`
}

export function useSync() {
  const ctx = use(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { token, isOnline } = useAuth()
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    lastSynced: null,
    error: null,
    pendingCount: 0,
  })

  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    setSyncStateCallback((update) => {
      setState((prev) => ({ ...prev, ...update }))
    })
    return () => clearSyncStateCallback()
  }, [])

  useEffect(() => {
    if (token && isOnline) {
      startAutoSync()
    } else {
      stopAutoSync()
    }
    return () => stopAutoSync()
  }, [token, isOnline])

  useEffect(() => {
    if (!token) {
      const prevToken = cachedGet('auth_token')
      if (prevToken) {
        try {
          const parts = prevToken.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1])) as { sub?: string }
            const userId = payload.sub ?? ''
            if (userId) db.syncLog.where({ synced: 0, userId }).delete()
          }
        } catch {
          /* token already cleared */
        }
      }
      clearCursor()
      setState({ isSyncing: false, lastSynced: null, error: null, pendingCount: 0 })
    }
  }, [token])

  const syncNow = useCallback(() => {
    runSync((update) => setState((prev) => ({ ...prev, ...update })))
  }, [])

  const resetError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  const value = useMemo(() => ({ ...state, syncNow, resetError }), [state, syncNow, resetError])

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}
