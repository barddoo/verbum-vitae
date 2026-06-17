import { Capacitor } from '@capacitor/core'
import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      const promptEvent = e as BeforeInstallPromptEvent
      if (typeof promptEvent.prompt !== 'function') return
      e.preventDefault()
      setDeferredPrompt(promptEvent)
    }
    const installedHandler = () => {
      setDeferredPrompt(null)
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    if (typeof deferredPrompt.prompt !== 'function') return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  if (Capacitor.isNativePlatform() || !deferredPrompt || installed) return null

  return (
    <button type="button" className="btn btn-sm pwa-install-btn" onClick={handleInstall}>
      <Download size={16} strokeWidth={1.5} />
      Instalar App
    </button>
  )
}
