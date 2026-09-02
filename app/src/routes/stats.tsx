import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { computeStreak } from 'shared/streak'
import { MemorizedVersesTab } from '../components/memorized-verses-tab'
import { PageMeta } from '../components/page-meta'
import { db, reviewTimestamps, skippedToday } from '../lib/db'
import { RankingTab } from './stats/ranking-tab'

type Tab = 'resumo' | 'versiculos' | 'ranking'

interface CalendarTip {
  x: number
  y: number
  dateStr: string
  dateLabel: string
  count: number
}

export function StatsPage() {
  const [tab, setTab] = useState<Tab>('resumo')
  const [progress, setProgress] = useState<{
    total: number
    byState: Record<string, number>
    streak: number
    reviewsToday: number
    skipsToday: number
  }>({ total: 0, byState: {}, streak: 0, reviewsToday: 0, skipsToday: 0 })
  const [reviewDays, setReviewDays] = useState<Map<string, number>>(new Map())
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const [all, reviewedAts, todaySkips] = await Promise.all([db.progress.toArray(), reviewTimestamps(), skippedToday()])
    const today = new Date().toDateString()
    const stateNames = ['Novo', 'Aprendendo', 'Revisando', 'Reaprendendo']
    const byState: Record<string, number> = {}

    for (const p of all) {
      const state = stateNames[p.state] || 'Novo'
      byState[state] = (byState[state] || 0) + 1
    }

    // Counted from the append-only review log. Deriving these from `progress.lastReview` counted
    // each verse once, at its *latest* review — so a day's tally shrank as its verses came up
    // again, and the calendar quietly rewrote its own history.
    let reviewsToday = 0
    const dayCount = new Map<string, number>()
    for (const reviewedAt of reviewedAts) {
      const dayStr = new Date(reviewedAt).toDateString()
      if (dayStr === today) reviewsToday++
      dayCount.set(dayStr, (dayCount.get(dayStr) || 0) + 1)
    }

    setReviewDays(dayCount)
    setProgress({
      total: all.length,
      byState,
      streak: computeStreak(reviewedAts),
      reviewsToday,
      skipsToday: todaySkips,
    })
  }

  async function clearProgress() {
    await Promise.all([db.progress.clear(), db.reviewLog.clear(), db.skipLog.clear(), db.wordStats.clear(), db.syncLog.clear()])
    setConfirming(false)
    loadStats()
  }

  return (
    <div className="page stats-page">
      <PageMeta
        title="Progresso · Verbum Vitae"
        description="Acompanhe seu progresso na memorização bíblica. Veja estatísticas, calendário de revisões e ranking de versículos."
        path="/stats"
      />
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
          Meus Versículos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ranking'}
          className={`stats-tab${tab === 'ranking' ? ' active' : ''}`}
          onClick={() => setTab('ranking')}
        >
          Ranking
        </button>
      </div>

      {tab === 'resumo' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{progress.total}</span>
              <span className="stat-label">Em aprendizado</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{progress.streak}</span>
              <span className="stat-label">Dias seguidos</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{progress.reviewsToday}</span>
              <span className="stat-label">Hoje</span>
            </div>
          </div>

          <StreakCalendar reviewDays={reviewDays} />

          {progress.skipsToday > 0 && (
            <p className="stats-skip-note">
              Pulados hoje: {progress.skipsToday} {progress.skipsToday === 1 ? 'texto' : 'textos'}
            </p>
          )}

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
      {tab === 'ranking' && <RankingTab />}
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

  const scBodyRef = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<CalendarTip | null>(null)

  // Close on tap-away and Esc. The popover must not be touch-dead the way a `title` attribute is.
  useEffect(() => {
    function close() {
      setTip(null)
    }
    function onPointerAway(e: Event) {
      const t = e.target as HTMLElement | null
      if (t && (t.closest('.sc-cell') || t.closest('.sc-popover'))) return
      close()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onPointerAway)
    document.addEventListener('touchstart', onPointerAway)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerAway)
      document.removeEventListener('touchstart', onPointerAway)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  function showTip(e: React.MouseEvent<HTMLButtonElement>, cell: (typeof cells)[number]) {
    e.stopPropagation()
    if (tip?.dateStr === cell.dateStr) {
      setTip(null)
      return
    }
    const body = scBodyRef.current
    if (!body) return
    const bodyRect = body.getBoundingClientRect()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.min(rect.left - bodyRect.left, body.clientWidth - 170)
    setTip({
      x: Math.max(0, x),
      y: rect.top - bodyRect.top + rect.height,
      dateStr: cell.dateStr,
      dateLabel: formatDate(cell.date),
      count: cell.count,
    })
  }

  return (
    <div className="streak-calendar">
      <h3>Calendário de Revisões</h3>
      <div className="sc-body" ref={scBodyRef}>
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
                  <button
                    type="button"
                    key={cell.dateStr}
                    className={`sc-cell ${color(cell.count)}`}
                    aria-label={`${formatDate(cell.date)} — ${cell.count} revisões`}
                    onClick={(e) => showTip(e, cell)}
                  >
                    <span className="sc-cell-inner" aria-hidden="true" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        {tip && (
          <div className="sc-popover" style={{ left: tip.x, top: tip.y }} role="status">
            {tip.count > 0 ? (
              <>
                <strong>{tip.dateLabel}</strong>
                <span>
                  {tip.count} {tip.count === 1 ? 'revisão' : 'revisões'}
                </span>
              </>
            ) : (
              <>
                <strong>{tip.dateLabel}</strong>
                <span>sem revisões</span>
              </>
            )}
          </div>
        )}
        <div className="sc-legend">
          <span>Menos</span>
          <div className="sc-cell">
            <span className="sc-cell-inner" aria-hidden="true" />
          </div>
          <div className="sc-cell level-1">
            <span className="sc-cell-inner" aria-hidden="true" />
          </div>
          <div className="sc-cell level-2">
            <span className="sc-cell-inner" aria-hidden="true" />
          </div>
          <div className="sc-cell level-3">
            <span className="sc-cell-inner" aria-hidden="true" />
          </div>
          <div className="sc-cell level-4">
            <span className="sc-cell-inner" aria-hidden="true" />
          </div>
          <span>Mais</span>
        </div>
      </div>
    </div>
  )
})
