import { memo, useEffect, useMemo, useState } from 'react'
import { MemorizedVersesTab } from '../components/memorized-verses-tab'
import { db } from '../lib/db'
import { computeStreak } from '../lib/stats'

type Tab = 'resumo' | 'versiculos'

export function StatsPage() {
  const [tab, setTab] = useState<Tab>('resumo')
  const [progress, setProgress] = useState<{
    total: number
    byState: Record<string, number>
    streak: number
    reviewsToday: number
  }>({ total: 0, byState: {}, streak: 0, reviewsToday: 0 })
  const [reviewDays, setReviewDays] = useState<Map<string, number>>(new Map())
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const all = await db.progress.toArray()
    const today = new Date().toDateString()
    const stateNames = ['Novo', 'Aprendendo', 'Revisando', 'Reaprendendo']
    const byState: Record<string, number> = {}
    let reviewsToday = 0
    const dayCount = new Map<string, number>()

    for (const p of all) {
      const state = stateNames[p.state] || 'Novo'
      byState[state] = (byState[state] || 0) + 1
      if (new Date(p.updatedAt).toDateString() === today) reviewsToday++
      const dayStr = new Date(p.updatedAt).toDateString()
      dayCount.set(dayStr, (dayCount.get(dayStr) || 0) + 1)
    }

    setReviewDays(dayCount)
    setProgress({
      total: all.length,
      byState,
      streak: computeStreak(all.map((p) => p.updatedAt)),
      reviewsToday,
    })
  }

  async function clearProgress() {
    await db.progress.clear()
    await db.syncLog.clear()
    setConfirming(false)
    loadStats()
  }

  return (
    <div className="page stats-page">
      <h2>Progresso</h2>

      <div className="stats-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'resumo'}
          className={`stats-tab${tab === 'resumo' ? ' active' : ''}`}
          onClick={() => setTab('resumo')}
        >
          Resumo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'versiculos'}
          className={`stats-tab${tab === 'versiculos' ? ' active' : ''}`}
          onClick={() => setTab('versiculos')}
        >
          Versículos
        </button>
      </div>

      {tab === 'resumo' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{progress.total}</span>
              <span className="stat-label">Versículos</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{progress.streak}</span>
              <span className="stat-label">Sequência</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{progress.reviewsToday}</span>
              <span className="stat-label">Hoje</span>
            </div>
          </div>

          <StreakCalendar reviewDays={reviewDays} />

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

          {progress.total > 0 && (
            <div className="stats-danger-zone">
              {!confirming ? (
                <button type="button" className="btn btn-danger-outline" onClick={() => setConfirming(true)}>
                  Recomeçar do zero
                </button>
              ) : (
                <div className="stats-confirm">
                  <span className="stats-confirm-label">Isso vai apagar todo o progresso. Tem certeza?</span>
                  <div className="stats-confirm-actions">
                    <button type="button" className="btn btn-danger" onClick={clearProgress}>
                      Sim, limpar
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {progress.total === 0 && (
            <div className="stats-empty">
              Nenhum versículo estudado ainda.
              <br />
              Comece a revisar para ver seu progresso aqui.
            </div>
          )}
        </>
      )}

      {tab === 'versiculos' && <MemorizedVersesTab />}
    </div>
  )
}

const StreakCalendar = memo(function StreakCalendar({ reviewDays }: { reviewDays: Map<string, number> }) {
  const cells = useMemo(() => {
    const weeks = 20
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - weeks * 7 + 1)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    const result: { date: Date; count: number; dateStr: string }[] = []
    const cursor = new Date(startDate)
    while (cursor <= today) {
      const dateStr = cursor.toDateString()
      result.push({ date: new Date(cursor), count: reviewDays.get(dateStr) || 0, dateStr })
      cursor.setDate(cursor.getDate() + 1)
    }
    return result
  }, [reviewDays])

  const weeks_arr = useMemo(() => {
    const w: (typeof cells)[] = []
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7))
    return w
  }, [cells])

  const monthLabels = useMemo(() => {
    const labels: { label: string; cellIndex: number }[] = []
    let lastMonth = -1
    cells.forEach((cell, ci) => {
      const m = cell.date.getMonth()
      if (m !== lastMonth) {
        labels.push({ label: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][m], cellIndex: ci })
        lastMonth = m
      }
    })
    return labels
  }, [cells])

  const maxCount = useMemo(() => Math.max(1, ...cells.map((c) => c.count)), [cells])

  function color(count: number): string {
    if (count === 0) return ''
    const ratio = count / maxCount
    if (ratio > 0.66) return 'level-4'
    if (ratio > 0.33) return 'level-3'
    if (ratio > 0.1) return 'level-2'
    return 'level-1'
  }

  function formatDate(d: Date): string {
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="streak-calendar">
      <h3>Calendário de Revisões</h3>
      <div className="sc-body">
        <div className="sc-months">
          {monthLabels.map((ml) => (
            <span key={ml.cellIndex} className="sc-month" style={{ marginLeft: `${23 + Math.floor(ml.cellIndex / 7) * 16}px` }}>
              {ml.label}
            </span>
          ))}
        </div>
        <div className="sc-grid">
          <div className="sc-days">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <span key={d} className="sc-day-label">
                {d}
              </span>
            ))}
          </div>
          <div className="sc-weeks">
            {weeks_arr.map((week, wi) => (
              <div key={wi} className="sc-week">
                {week.map((cell) => (
                  <div
                    key={cell.dateStr}
                    className={`sc-cell ${color(cell.count)}`}
                    title={`${formatDate(cell.date)} — ${cell.count} revisões`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="sc-legend">
          <span>Menos</span>
          <div className="sc-cell" />
          <div className="sc-cell level-1" />
          <div className="sc-cell level-2" />
          <div className="sc-cell level-3" />
          <div className="sc-cell level-4" />
          <span>Mais</span>
        </div>
      </div>
    </div>
  )
})
