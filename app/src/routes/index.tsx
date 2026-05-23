import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { db } from '../lib/db'
import { getDueCards } from '../lib/srs'

export function HomePage() {
  const [dueCount, setDueCount] = useState(0)
  const [totalMemorized, setTotalMemorized] = useState(0)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    loadStats().then(() => {
      if (mounted.current) setLoading(false)
    })
    return () => {
      mounted.current = false
    }
  }, [loadStats])

  async function loadStats() {
    const allProgress = await db.progress.toArray()
    const dueCards = getDueCards(allProgress)
    setTotalMemorized(allProgress.length)
    setDueCount(dueCards.length)
    setStreak(computeStreak(allProgress.map((p) => p.dueDate)))
  }

  function computeStreak(timestamps: number[]) {
    const days = [...new Set(timestamps.map((ts) => new Date(ts).toDateString()))].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    )
    let streak = 0
    const today = new Date().toDateString()
    let expected = new Date(today).getTime()

    for (const dayStr of days) {
      const dayTime = new Date(dayStr).getTime()
      if (dayTime === expected) {
        streak++
        expected -= 86400000
      } else if (dayTime < expected) {
        break
      }
    }

    if (!days.includes(today) && !days.includes(new Date(Date.now() - 86400000).toDateString())) {
      streak = 0
    }

    return streak
  }

  return (
    <div className="page home-page">
      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <>
          <div className="hero-card">
            <h2 className="hero-greeting">{dueCount > 0 ? `${dueCount} versículos para revisar` : 'Nada pendente!'}</h2>
            {dueCount > 0 && (
              <Link to="/review" className="btn btn-primary btn-large">
                Revisar Agora ({dueCount})
              </Link>
            )}
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{totalMemorized}</span>
              <span className="stat-label">Memorizados</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{streak}</span>
              <span className="stat-label">Dias de Streak</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{dueCount}</span>
              <span className="stat-label">Pendentes</span>
            </div>
          </div>

          <div className="quick-actions">
            {dueCount === 0 && totalMemorized > 0 ? (
              <>
                <Link to="/review" className="btn btn-primary">
                  Praticar versículos
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
