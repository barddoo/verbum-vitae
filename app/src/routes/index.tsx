import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Brain, WifiOff } from 'lucide-react'
import { useContext, useEffect, useMemo } from 'react'
import { computeStreak } from 'shared/streak'
import { CommunityPresenceCard } from '../components/community-presence-card'
import { DailyReminderCard } from '../components/daily-reminder-card'
import { InstallGuideCard } from '../components/install-guide-card'
import { PageMeta } from '../components/page-meta'
import { db, reviewTimestamps } from '../lib/db'
import { WelcomeModalContext } from '../router'

const loadingSpinner = <div className="loading">Carregando…</div>

export function HomePage() {
  const allProgress = useLiveQuery(() => db.progress.toArray(), [])
  const reviewedAts = useLiveQuery(() => reviewTimestamps(), [])
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
      // From the append-only log, not `progress.lastReview`, which holds only the latest review
      // per verse and so loses the days that make up a streak.
      streak: computeStreak(reviewedAts ?? []),
    }
  }, [allProgress, reviewedAts])

  const dueCount = stats?.dueCount ?? 0
  const totalMemorized = stats?.totalMemorized ?? 0
  const streak = stats?.streak ?? 0
  const memorized = totalMemorized > 0
  const nf = useMemo(() => new Intl.NumberFormat('pt-BR'), [])

  useEffect(() => {
    if (allProgress && allProgress.length === 0) {
      closeWelcome()
      localStorage.setItem('welcomed', '1')
    }
  }, [allProgress, closeWelcome])

  return (
    <>
      <PageMeta
        title="Verbum Vitae — Memorização Bíblica"
        description="Memorização bíblica com repetição espaçada. Aprenda e memorize versículos da Bíblia com flashcards inteligentes e acompanhamento de progresso."
      />
      <div className="page home-page">
        {!stats ? (
          loadingSpinner
        ) : (
          <>
            {memorized ? (
              <div className="hero-card">
                <h2 className="hero-greeting">{dueCount > 0 ? `${nf.format(dueCount)} para revisar` : 'Nada pendente!'}</h2>
                {dueCount > 0 && (
                  <Link to="/review" search={{ autostart: '1' }} className="btn btn-primary btn-large">
                    Revisar Agora ({nf.format(dueCount)})
                  </Link>
                )}
              </div>
            ) : (
              <div className="welcome-hero">
                <h2 className="welcome-headline">
                  Memorize a Bíblia com <span className="welcome-headline-accent">repetição espaçada</span>
                </h2>
                <p className="welcome-subtitle">
                  Aprenda versículos no seu ritmo, com revisões inteligentes que aparecem no momento certo.
                </p>
                <div className="welcome-features">
                  <div className="welcome-feature-item">
                    <BookOpen size={20} className="welcome-feature-icon" />
                    <span className="welcome-feature-label">6 traduções</span>
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
                    Explorar a Bíblia
                  </Link>
                  <Link to="/collections" className="btn btn-secondary btn-large">
                    Ver Coleções Temáticas
                  </Link>
                </div>
                <p className="welcome-reassurance">Grátis · Sem cadastro</p>
              </div>
            )}

            <CommunityPresenceCard memorized={memorized} />
            <InstallGuideCard />

            {memorized && (
              <div className="collections-teaser">
                <p className="collections-teaser-text">Adicione vários versículos de uma vez com coleções temáticas</p>
                <Link to="/collections" className="btn btn-secondary btn-sm">
                  Ver Coleções
                </Link>
              </div>
            )}

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{nf.format(totalMemorized)}</span>
                <span className="stat-label">Em aprendizado</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{nf.format(streak)}</span>
                <span className="stat-label">Dias seguidos</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{nf.format(dueCount)}</span>
                <span className="stat-label">Pendentes</span>
              </div>
            </div>

            {memorized && <DailyReminderCard />}

            <div className="quick-actions">
              {memorized && dueCount === 0 ? (
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
    </>
  )
}
