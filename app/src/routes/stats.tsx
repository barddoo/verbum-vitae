import { useEffect, useState } from 'react'
import { db } from '../lib/db'

export function StatsPage() {
  const [progress, setProgress] = useState<{
    total: number
    byState: Record<string, number>
    streak: number
    reviewsToday: number
  }>({ total: 0, byState: {}, streak: 0, reviewsToday: 0 })

  useEffect(() => {
    loadStats()
  }, [loadStats])

  async function loadStats() {
    const all = await db.progress.toArray()
    const today = new Date().toDateString()
    const stateNames = ['Novo', 'Aprendendo', 'Revisando', 'Reaprendendo']

    const byState: Record<string, number> = {}
    let reviewsToday = 0

    for (const p of all) {
      const state = stateNames[p.state] || 'Novo'
      byState[state] = (byState[state] || 0) + 1
      if (new Date(p.updatedAt).toDateString() === today) {
        reviewsToday++
      }
    }

    setProgress({
      total: all.length,
      byState,
      streak: computeStreak(all.map((p) => p.updatedAt)),
      reviewsToday,
    })
  }

  function computeStreak(updates: number[]) {
    const days = [...new Set(updates.map((ts) => new Date(ts).toDateString()))].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    )
    let s = 0
    const today = new Date().toDateString()
    let expected = new Date(today).getTime()

    for (const dayStr of days) {
      const dayTime = new Date(dayStr).getTime()
      if (dayTime === expected) {
        s++
        expected -= 86400000
      } else if (dayTime < expected) break
    }
    return s
  }

  return (
    <div className="page stats-page">
      <h2>Progresso</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{progress.total}</span>
          <span className="stat-label">Versículos</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{progress.streak}</span>
          <span className="stat-label">Dias</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{progress.reviewsToday}</span>
          <span className="stat-label">Hoje</span>
        </div>
      </div>

      <div className="stats-breakdown">
        <h3>Por estágio</h3>
        {Object.entries(progress.byState).map(([state, count]) => (
          <div key={state} className="breakdown-row">
            <span className="breakdown-label">{state}</span>
            <div className="breakdown-bar-container">
              <div className="breakdown-bar" style={{ width: `${progress.total > 0 ? (count / progress.total) * 100 : 0}%` }} />
            </div>
            <span className="breakdown-count">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
