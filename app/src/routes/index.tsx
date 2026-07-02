import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Brain, Share2, Smartphone, WifiOff, X } from 'lucide-react'
import { useContext, useEffect, useMemo, useState } from 'react'
import { PageMeta } from '../components/page-meta'
import { db } from '../lib/db'
import { usePresence } from '../lib/presence-context'
import { shareVerse } from '../lib/sharing'
import { computeStreak } from '../lib/stats'
import { WelcomeModalContext } from '../router'

const loadingSpinner = (
  <div className="loading">
    <Trans>Carregando…</Trans>
  </div>
)

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
  const { i18n } = useLingui()
  const { count: presenceCount } = usePresence()
  const allProgress = useLiveQuery(() => db.progress.toArray(), [])
  const { show, deferredPrompt, isIOS, isAndroid, handleInstall, dismiss } = useInstallGuide()
  const { closeWelcome } = useContext(WelcomeModalContext)

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
  const nf = useMemo(() => new Intl.NumberFormat(i18n.locale), [i18n.locale])

  useEffect(() => {
    if (allProgress && allProgress.length === 0) {
      closeWelcome()
      localStorage.setItem('welcomed', '1')
    }
  }, [allProgress, closeWelcome])

  return (
    <>
      <PageMeta
        title={t`Verbum Vitae — Memorização Bíblica`}
        description={t`Memorização bíblica com repetição espaçada. Aprenda e memorize versículos da Bíblia com flashcards inteligentes e acompanhamento de progresso.`}
      />
      <div className="page home-page">
        {!stats ? (
          loadingSpinner
        ) : totalMemorized === 0 ? (
          <>
            <div className="welcome-hero">
              <h2 className="welcome-headline">
                <Trans>
                  Memorize a Bíblia com <span className="welcome-headline-accent">repetição espaçada</span>
                </Trans>
              </h2>
              <p className="welcome-subtitle">
                <Trans>Aprenda versículos no seu ritmo, com revisões inteligentes que aparecem no momento certo.</Trans>
              </p>
              <div className="welcome-features">
                <div className="welcome-feature-item">
                  <BookOpen size={20} className="welcome-feature-icon" />
                  <span className="welcome-feature-label">
                    <Trans>6 traduções</Trans>
                  </span>
                </div>
                <div className="welcome-feature-item">
                  <Brain size={20} className="welcome-feature-icon" />
                  <span className="welcome-feature-label">FSRS</span>
                </div>
                <div className="welcome-feature-item">
                  <WifiOff size={20} className="welcome-feature-icon" />
                  <span className="welcome-feature-label">Offline</span>
                </div>
              </div>
              <div className="welcome-cta">
                <Link to="/browse" className="btn btn-primary btn-large">
                  <Trans>Explorar a Bíblia</Trans>
                </Link>
                <Link to="/collections" className="btn btn-secondary btn-large">
                  <Trans>Ver Coleções Temáticas</Trans>
                </Link>
              </div>
              <p className="welcome-reassurance">
                <Trans>Grátis · Sem cadastro</Trans>
              </p>
            </div>

            <div className="community-presence-card" aria-live="polite">
              {presenceCount > 0 ? (
                <>
                  <span className="community-presence-main">
                    <span className="community-presence-count">{nf.format(presenceCount)}</span>
                    <span className="community-presence-unit">{presenceCount === 1 ? t`pessoa` : t`pessoas`}</span>
                  </span>
                  <span className="community-presence-label">
                    <Trans>memorizando agora</Trans>
                  </span>
                  <span className="community-presence-encourage">
                    <Trans>Junte-se a eles!</Trans>
                  </span>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => shareVerse()}>
                    <Trans>Compartilhar</Trans>
                  </button>
                </>
              ) : (
                <>
                  <span className="community-presence-encourage">
                    <Trans>Seja o primeiro a memorizar hoje!</Trans>
                  </span>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => shareVerse()}>
                    <Trans>Compartilhar</Trans>
                  </button>
                </>
              )}
            </div>

            {show && (
              <div className="install-guide-card">
                <button type="button" className="install-guide-close" onClick={dismiss} aria-label={t`Fechar`}>
                  <X size={16} aria-hidden />
                </button>
                <span className="install-guide-icon" aria-hidden="true">
                  <Smartphone size={24} />
                </span>
                <div className="install-guide-body">
                  <strong className="install-guide-title">
                    <Trans>Instalar como aplicativo</Trans>
                  </strong>
                  <p className="install-guide-subtitle">
                    <Trans>Funciona offline, sem distrações e com acesso rápido na tela inicial.</Trans>
                  </p>
                  {deferredPrompt ? (
                    <button type="button" className="btn btn-primary install-guide-btn" onClick={handleInstall}>
                      <Trans>Instalar App</Trans>
                    </button>
                  ) : isIOS ? (
                    <ol className="install-guide-steps">
                      <li>
                        <Trans>
                          Abra este app no <strong>Safari</strong> (não funciona no Chrome)
                        </Trans>
                      </li>
                      <li>
                        <Trans>
                          Toque no ícone <strong>Compartilhar</strong>{' '}
                          <span className="install-guide-share-icon" aria-hidden="true">
                            <Share2 size={14} />
                          </span>{' '}
                          na barra inferior
                        </Trans>
                      </li>
                      <li>
                        <Trans>
                          Role para baixo e toque <strong>"Adicionar à Tela de Início"</strong>
                        </Trans>
                      </li>
                      <li>
                        <Trans>
                          Toque <strong>"Adicionar"</strong> no canto superior direito
                        </Trans>
                      </li>
                    </ol>
                  ) : isAndroid ? (
                    <ol className="install-guide-steps">
                      <li>
                        <Trans>
                          Abra no <strong>Chrome</strong>
                        </Trans>
                      </li>
                      <li>
                        <Trans>
                          Toque no menu <strong>⋮</strong> (três pontos) no canto superior direito
                        </Trans>
                      </li>
                      <li>
                        <Trans>
                          Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>
                        </Trans>
                      </li>
                      <li>
                        <Trans>
                          Toque em <strong>"Instalar"</strong>
                        </Trans>
                      </li>
                    </ol>
                  ) : null}
                </div>
              </div>
            )}

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{nf.format(totalMemorized)}</span>
                <span className="stat-label">
                  <Trans>Em aprendizado</Trans>
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{nf.format(streak)}</span>
                <span className="stat-label">
                  <Trans>Dias de Streak</Trans>
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{nf.format(dueCount)}</span>
                <span className="stat-label">
                  <Trans>Pendentes</Trans>
                </span>
              </div>
            </div>

            <div className="quick-actions">
              <Link to="/browse" className="btn btn-secondary">
                <Trans>+ Adicionar Versículo</Trans>
              </Link>
              <Link to="/collections" className="btn btn-secondary">
                <Trans>Coleções</Trans>
              </Link>
              <Link to="/stats" className="btn btn-secondary">
                <Trans>Ver Progresso</Trans>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="hero-card">
              <h2 className="hero-greeting">{dueCount > 0 ? t`${nf.format(dueCount)} para revisar` : t`Nada pendente!`}</h2>
              {dueCount > 0 && (
                <Link to="/review" search={{ autostart: '1' }} className="btn btn-primary btn-large">
                  <Trans>Revisar Agora ({nf.format(dueCount)})</Trans>
                </Link>
              )}
            </div>

            <div className="community-presence-card" aria-live="polite">
              {presenceCount > 0 ? (
                <>
                  <span className="community-presence-main">
                    <span className="community-presence-count">{nf.format(presenceCount)}</span>
                    <span className="community-presence-unit">{presenceCount === 1 ? t`pessoa` : t`pessoas`}</span>
                  </span>
                  <span className="community-presence-label">
                    <Trans>memorizando agora</Trans>
                  </span>
                  <span className="community-presence-encourage">
                    <Trans>Continue assim!</Trans>
                  </span>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => shareVerse()}>
                    <Trans>Compartilhar</Trans>
                  </button>
                </>
              ) : (
                <>
                  <span className="community-presence-encourage">
                    <Trans>Continue memorizando!</Trans>
                  </span>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => shareVerse()}>
                    <Trans>Compartilhar</Trans>
                  </button>
                </>
              )}
            </div>

            {show && (
              <div className="install-guide-card">
                <button type="button" className="install-guide-close" onClick={dismiss} aria-label={t`Fechar`}>
                  <X size={16} aria-hidden />
                </button>
                <span className="install-guide-icon" aria-hidden="true">
                  <Smartphone size={24} />
                </span>
                <div className="install-guide-body">
                  <strong className="install-guide-title">
                    <Trans>Instalar como aplicativo</Trans>
                  </strong>
                  <p className="install-guide-subtitle">
                    <Trans>Funciona offline, sem distrações e com acesso rápido na tela inicial.</Trans>
                  </p>
                  {deferredPrompt ? (
                    <button type="button" className="btn btn-primary install-guide-btn" onClick={handleInstall}>
                      <Trans>Instalar App</Trans>
                    </button>
                  ) : isIOS ? (
                    <ol className="install-guide-steps">
                      <li>
                        <Trans>
                          Abra este app no <strong>Safari</strong> (não funciona no Chrome)
                        </Trans>
                      </li>
                      <li>
                        <Trans>
                          Toque no ícone <strong>Compartilhar</strong>{' '}
                          <span className="install-guide-share-icon" aria-hidden="true">
                            <Share2 size={14} />
                          </span>{' '}
                          na barra inferior
                        </Trans>
                      </li>
                      <li>
                        <Trans>
                          Role para baixo e toque <strong>"Adicionar à Tela de Início"</strong>
                        </Trans>
                      </li>
                      <li>
                        <Trans>
                          Toque <strong>"Adicionar"</strong> no canto superior direito
                        </Trans>
                      </li>
                    </ol>
                  ) : isAndroid ? (
                    <ol className="install-guide-steps">
                      <li>
                        <Trans>
                          Abra no <strong>Chrome</strong>
                        </Trans>
                      </li>
                      <li>
                        <Trans>
                          Toque no menu <strong>⋮</strong> (três pontos) no canto superior direito
                        </Trans>
                      </li>
                      <li>
                        <Trans>
                          Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>
                        </Trans>
                      </li>
                      <li>
                        <Trans>
                          Toque em <strong>"Instalar"</strong>
                        </Trans>
                      </li>
                    </ol>
                  ) : null}
                </div>
              </div>
            )}

            <div className="collections-teaser">
              <p className="collections-teaser-text">
                <Trans>Adicione vários versículos de uma vez com coleções temáticas</Trans>
              </p>
              <Link to="/collections" className="btn btn-secondary btn-sm">
                <Trans>Ver Coleções</Trans>
              </Link>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{nf.format(totalMemorized)}</span>
                <span className="stat-label">
                  <Trans>Em aprendizado</Trans>
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{nf.format(streak)}</span>
                <span className="stat-label">
                  <Trans>Dias de Streak</Trans>
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{nf.format(dueCount)}</span>
                <span className="stat-label">
                  <Trans>Pendentes</Trans>
                </span>
              </div>
            </div>

            <div className="quick-actions">
              {dueCount === 0 && totalMemorized > 0 ? (
                <>
                  <Link to="/review" search={{ autostart: '1' }} className="btn btn-primary">
                    <Trans>Revisar Agora</Trans>
                  </Link>
                  <Link to="/collections" className="btn btn-secondary">
                    <Trans>Coleções</Trans>
                  </Link>
                  <Link to="/browse" className="btn btn-secondary">
                    <Trans>+ Memorizar novos</Trans>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/browse" className="btn btn-secondary">
                    <Trans>+ Adicionar Versículo</Trans>
                  </Link>
                  <Link to="/collections" className="btn btn-secondary">
                    <Trans>Coleções</Trans>
                  </Link>
                  <Link to="/stats" className="btn btn-secondary">
                    <Trans>Ver Progresso</Trans>
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
