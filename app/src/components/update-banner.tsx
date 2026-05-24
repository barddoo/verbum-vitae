import { useRegisterSW } from 'virtual:pwa-register/react'
import { Download } from 'lucide-react'

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      if (reg) {
        setInterval(
          async () => {
            if (!navigator.onLine) return
            try {
              await reg.update()
            } catch {
              /* retry next interval */
            }
          },
          60 * 60 * 1000,
        )
      }
    },
  })

  if (offlineReady) return null
  if (!needRefresh) return null

  return (
    <div className="update-banner">
      <span className="update-banner-text">Nova versão disponível</span>
      <span className="update-banner-version">v{__APP_VERSION__}</span>
      <button type="button" className="update-banner-btn" onClick={() => updateServiceWorker(true)}>
        <Download size={14} />
        Atualizar
      </button>
      <button type="button" className="update-banner-dismiss" onClick={() => setNeedRefresh(false)} aria-label="Fechar">
        x
      </button>
    </div>
  )
}
