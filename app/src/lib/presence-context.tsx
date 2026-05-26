import { createContext, type ReactNode, use, useCallback, useEffect, useRef, useState } from 'react'

interface PresenceState {
  count: number
  isConnected: boolean
}

const PresenceContext = createContext<PresenceState | null>(null)

function wsUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return `${import.meta.env.VITE_WS_URL}/ws/presence`
  }
  const origin = import.meta.env.VITE_API_URL || window.location.origin
  const base = origin.replace(/\/+$/, '')
  return `${base.replace(/^http/, 'ws')}/ws/presence`
}

export function usePresence() {
  const ctx = use(PresenceContext)
  if (!ctx) throw new Error('usePresence must be used within PresenceProvider')
  return ctx
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PresenceState>({ count: 0, isConnected: false })
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryRef = useRef(0)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket(wsUrl())

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close()
          return
        }
        wsRef.current = ws
        setState((prev) => ({ ...prev, isConnected: true }))
        retryRef.current = 0
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'count') {
            setState((prev) => ({ ...prev, count: data.count }))
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        wsRef.current = null
        setState((prev) => ({ ...prev, isConnected: false }))
        const delay = Math.min(1000 * 2 ** retryRef.current, 30_000)
        retryRef.current++
        timerRef.current = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        // onerror is always followed by onclose — reconnect handled there
      }
    } catch {
      const delay = Math.min(1000 * 2 ** retryRef.current, 30_000)
      retryRef.current++
      timerRef.current = setTimeout(connect, delay)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      disconnect()
    }
  }, [connect, disconnect])

  return <PresenceContext.Provider value={state}>{children}</PresenceContext.Provider>
}
