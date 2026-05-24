import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../lib/db'
import { computeStreak } from '../lib/stats'

const loadingSpinner = <div className="loading">Carregando...</div>

export function HomePage() {
  const [dueCount, setDueCount] = useState(0)
  const [totalMemorized, setTotalMemorized] = useState(0)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  const loadStats = useCallback(async () => {
    const allProgress = await db.progress.toArray()
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
    setTotalMemorized(allProgress.length)
    setDueCount(due)
    setStreak(computeStreak(allProgress.map((p) => p.dueDate)))
  }, [])

  useEffect(() => {
    mounted.current = true
    loadStats().then(() => {
      if (mounted.current) setLoading(false)
    })
    return () => {
      mounted.current = false
    }
  }, [loadStats])

  return (
    <div className="page home-page">
      {loading ? (
{loadingSpinner}
      ) : (
        <>
          <div className="hero-card">
            <h2 className="hero-greeting">{dueCount > 0 ? `${dueCount} versículos para revisar` : 'Nada pendente!'}</h2>
            {dueCount > 0 && (
              <Link to="/review" search={{ autostart: '1' }} className="btn btn-primary btn-large">
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
                <Link to="/review" search={{ autostart: '1' }} className="btn btn-primary">
                  Praticar versículos
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
