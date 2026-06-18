import { useRegisterSW } from 'virtual:pwa-register/react'
import { Capacitor } from '@capacitor/core'
import { Download, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

const LS_KEY = 'pwa_version_id'
const VERSION_TAG_KEY = 'pwa_version_tag'
const DISMISSED_KEY = 'pwa_version_dismissed'

interface HealthResponse {
  ok: boolean
  time: string
  versionId: string
  version: string
}

async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/health`)
    if (!res.ok) return null
    return await (res.json() as Promise<HealthResponse>)
  } catch {
    return null
  }
}

export function UpdateBanner() {
  const regRef = useRef<ServiceWorkerRegistration | null>(null)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      if (!reg) return
      regRef.current = reg

      const poll = async () => {
        if (!navigator.onLine) return
        try {
          await reg.update()
        } catch {
          /* retry next interval */
        }

        const health = await fetchHealth()
        if (!health) return
        const oldId = localStorage.getItem(LS_KEY)
        const dismissed = localStorage.getItem(DISMISSED_KEY)
        if (health.versionId && oldId && health.versionId !== oldId && health.versionId !== dismissed) {
          setNeedRefresh(true)
          localStorage.setItem(LS_KEY, health.versionId)
          localStorage.setItem(VERSION_TAG_KEY, health.version)
        }
      }

      setInterval(poll, 60 * 60 * 1000)

      fetchHealth().then((health) => {
        if (health && !localStorage.getItem(LS_KEY)) {
          localStorage.setItem(LS_KEY, health.versionId)
          localStorage.setItem(VERSION_TAG_KEY, health.version)
        }
      })
    },
  })

  useEffect(() => {
    const check = () => {
      if (!navigator.onLine) return
      regRef.current?.update().catch(() => {})
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', check)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', check)
    }
  }, [])

  if (Capacitor.isNativePlatform()) return null
  if (offlineReady && !needRefresh) return null
  if (!needRefresh) return null

  const newVersion = localStorage.getItem(VERSION_TAG_KEY) || __APP_VERSION__

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span className="update-banner-text">Nova versão disponível</span>
      <span className="update-banner-version">{newVersion}</span>
      <button type="button" className="update-banner-btn" onClick={() => updateServiceWorker(true)}>
        <Download size={14} aria-hidden />
        Atualizar
      </button>
      <button
        type="button"
        className="update-banner-dismiss"
        onClick={() => {
          const id = localStorage.getItem(LS_KEY)
          if (id) localStorage.setItem(DISMISSED_KEY, id)
          setNeedRefresh(false)
        }}
        aria-label="Fechar"
      >
        <X size={12} aria-hidden />
      </button>
    </div>
  )
}
