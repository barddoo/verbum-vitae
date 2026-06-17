import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import { usePresence } from '../lib/presence-context'
import { shareVerse } from '../lib/sharing'
import { computeStreak } from '../lib/stats'

const loadingSpinner = <div className="loading">Carregando…</div>

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function useInstallGuide() {
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

  const ua = navigator.userAgent
  const isIOS = /iphone|ipad|ipod/i.test(ua)
  const isAndroid = /android/i.test(ua)
  const isDesktop = !isIOS && !isAndroid

  return {
    show: !isStandalone && !dismissed && (isIOS || isAndroid || !!deferredPrompt),
    deferredPrompt,
    isIOS,
    isAndroid,
    isDesktop,
    handleInstall,
    dismiss,
  }
}

export function HomePage() {
  const { count: presenceCount } = usePresence()
  const allProgress = useLiveQuery(() => db.progress.toArray(), [])
  const { show, deferredPrompt, isIOS, isAndroid, handleInstall, dismiss } = useInstallGuide()

  const stats = useMemo(() => {
    if (!allProgress) return null
    const now = Date.now()
    let due = 0
    for (const p of allProgress) {
      try {
        const card = JSON.parse(p.cardJson)
        if (new Date(card.due).getTime() <= now) due++
      } catch {
        /* skip */
      }
    }
    return {
      dueCount: due,
      totalMemorized: allProgress.length,
      streak: computeStreak(allProgress.map((p) => p.dueDate)),
    }
  }, [allProgress])

  const dueCount = stats?.dueCount ?? 0
  const totalMemorized = stats?.totalMemorized ?? 0
  const streak = stats?.streak ?? 0
  const nf = useMemo(() => new Intl.NumberFormat('pt-BR'), [])

  return (
    <div className="page home-page">
      {!stats ? (
        loadingSpinner
      ) : (
        <>
          <div className="hero-card">
            <h2 className="hero-greeting">{dueCount > 0 ? `${nf.format(dueCount)} para revisar` : 'Nada pendente!'}</h2>
            {dueCount > 0 && (
              <Link to="/review" search={{ autostart: '1' }} className="btn btn-primary btn-large">
                Revisar Agora ({nf.format(dueCount)})
              </Link>
            )}
          </div>

          <div className="community-presence-card" aria-live="polite">
            {presenceCount > 0 ? (
              <>
                <span className="community-presence-main">
                  <span className="community-presence-count">{nf.format(presenceCount)}</span>
                  <span className="community-presence-unit">{presenceCount === 1 ? 'pessoa' : 'pessoas'}</span>
                </span>
                <span className="community-presence-label">memorizando agora</span>
                <span className="community-presence-encourage">Continue assim!</span>
                <button type="button" className="community-invite-link" onClick={() => shareVerse()}>
                  Compartilhar
                </button>
              </>
            ) : (
              <>
                <span className="community-presence-encourage">Continue memorizando!</span>
                <button type="button" className="community-invite-link" onClick={() => shareVerse()}>
                  Compartilhar
                </button>
              </>
            )}
          </div>

          {show && (
            <div className="install-guide-card">
              <button type="button" className="install-guide-close" onClick={dismiss} aria-label="Fechar">
                ✕
              </button>
              <span className="install-guide-icon" aria-hidden="true">
                📲
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
                        📤
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
          )}

          <div className="collections-teaser">
            <p className="collections-teaser-text">Adicione vários versículos de uma vez com coleções temáticas</p>
            <Link to="/collections" className="btn btn-secondary btn-sm">
              Ver Coleções
            </Link>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{nf.format(totalMemorized)}</span>
              <span className="stat-label">Em aprendizado</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{nf.format(streak)}</span>
              <span className="stat-label">Dias de Streak</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{nf.format(dueCount)}</span>
              <span className="stat-label">Pendentes</span>
            </div>
          </div>

          <div className="quick-actions">
            {dueCount === 0 && totalMemorized > 0 ? (
              <>
                <Link to="/review" search={{ autostart: '1' }} className="btn btn-primary">
                  Revisar Agora
                </Link>
                <Link to="/collections" className="btn btn-secondary">
                  Coleções
                </Link>
                <Link to="/browse" className="btn btn-secondary">
                  + Memorizar novos
                </Link>
              </>
            ) : (
              <>
                <Link to="/browse" className="btn btn-secondary">
                  + Adicionar Versículo
                </Link>
                <Link to="/collections" className="btn btn-secondary">
                  Coleções
                </Link>
                <Link to="/stats" className="btn btn-secondary">
                  Ver Progresso
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
