import { Share2, Smartphone, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA install helper card: dismissible, platform-aware. Extracted so both home branches
 * (no progress / has progress) render the same card instead of ~80 copy-pasted lines.
 */
export function InstallGuideCard() {
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('dismissedInstallGuide') === '1')

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    setIsStandalone(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const promptEvent = e as BeforeInstallPromptEvent
      if (typeof promptEvent.prompt !== 'function') return
      e.preventDefault()
      setDeferredPrompt(promptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const ua = navigator.userAgent
  const isIOS = /iphone|ipad|ipod/i.test(ua)
  const isAndroid = /android/i.test(ua)

  const show = !isStandalone && !dismissed && (isIOS || isAndroid || !!deferredPrompt)
  if (!show) return null

  const dismiss = () => {
    localStorage.setItem('dismissedInstallGuide', '1')
    setDismissed(true)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setDismissed(true)
    }
  }

  return (
    <div className="install-guide-card">
      <button type="button" className="install-guide-close" onClick={dismiss} aria-label="Fechar">
        <X size={16} aria-hidden />
      </button>
      <span className="install-guide-icon" aria-hidden="true">
        <Smartphone size={24} />
      </span>
      <div className="install-guide-body">
        <strong className="install-guide-title">Instalar como aplicativo</strong>
        <p className="install-guide-subtitle">Funciona offline, sem distrações e com acesso rápido na tela inicial.</p>
        {deferredPrompt ? (
          <button type="button" className="btn btn-primary install-guide-btn" onClick={handleInstall}>
            Instalar App
          </button>
        ) : isIOS ? (
          <ol className="install-guide-steps">
            <li>
              Abra este app no <strong>Safari</strong> (não funciona no Chrome)
            </li>
            <li>
              Toque no ícone <strong>Compartilhar</strong>{' '}
              <span className="install-guide-share-icon" aria-hidden="true">
                <Share2 size={14} />
              </span>{' '}
              na barra inferior
            </li>
            <li>
              Role para baixo e toque <strong>"Adicionar à Tela de Início"</strong>
            </li>
            <li>
              Toque <strong>"Adicionar"</strong> no canto superior direito
            </li>
          </ol>
        ) : isAndroid ? (
          <ol className="install-guide-steps">
            <li>
              Abra no <strong>Chrome</strong>
            </li>
            <li>
              Toque no menu <strong>⋮</strong> (três pontos) no canto superior direito
            </li>
            <li>
              Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>
            </li>
            <li>
              Toque em <strong>"Instalar"</strong>
            </li>
          </ol>
        ) : null}
      </div>
    </div>
  )
}
