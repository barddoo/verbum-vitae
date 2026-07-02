import { i18n } from '@lingui/core'
import { plural, t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { memo, useEffect, useMemo, useState } from 'react'
import { MemorizedVersesTab } from '../components/memorized-verses-tab'
import { PageMeta } from '../components/page-meta'
import { db } from '../lib/db'
import { computeStreak } from '../lib/stats'
import { RankingTab } from './stats/ranking-tab'

type Tab = 'resumo' | 'versiculos' | 'ranking'

export function StatsPage() {
  useLingui() // subscribe to locale changes
  const [tab, setTab] = useState<Tab>('resumo')
  const [progress, setProgress] = useState<{
    total: number
    byState: Record<number, number>
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
    const byState: Record<number, number> = {}
    let reviewsToday = 0
    const dayCount = new Map<string, number>()

    for (const p of all) {
      byState[p.state] = (byState[p.state] || 0) + 1
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

  const stateNames: Record<number, string> = {
    0: t`Novo`,
    1: t`Aprendendo`,
    2: t`Revisando`,
    3: t`Reaprendendo`,
  }

  return (
    <div className="page stats-page">
      <PageMeta
        title={t`Progresso · Verbum Vitae`}
        description={t`Acompanhe seu progresso na memorização bíblica. Veja estatísticas, calendário de revisões e ranking de versículos.`}
        path="/stats"
      />
      <h2>
        <Trans>Progresso</Trans>
      </h2>

      <div className="stats-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'resumo'}
          className={`stats-tab${tab === 'resumo' ? ' active' : ''}`}
          onClick={() => setTab('resumo')}
        >
          <Trans>Resumo</Trans>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'versiculos'}
          className={`stats-tab${tab === 'versiculos' ? ' active' : ''}`}
          onClick={() => setTab('versiculos')}
        >
          <Trans>Versículos</Trans>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ranking'}
          className={`stats-tab${tab === 'ranking' ? ' active' : ''}`}
          onClick={() => setTab('ranking')}
        >
          <Trans>Ranking</Trans>
        </button>
      </div>

      {tab === 'resumo' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{progress.total}</span>
              <span className="stat-label">
                <Trans>Versículos</Trans>
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{progress.streak}</span>
              <span className="stat-label">
                <Trans>Sequência</Trans>
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{progress.reviewsToday}</span>
              <span className="stat-label">
                <Trans>Hoje</Trans>
              </span>
            </div>
          </div>

          <StreakCalendar reviewDays={reviewDays} locale={i18n.locale} />

          <div className="stats-breakdown">
            <h3>
              <Trans>Por estágio</Trans>
            </h3>
            {Object.entries(progress.byState).map(([stateNum, count]) => (
              <div key={stateNum} className="breakdown-row">
                <span className="breakdown-label">{stateNames[Number(stateNum)] ?? t`Novo`}</span>
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
                  <Trans>Recomeçar do zero</Trans>
                </button>
              ) : (
                <div className="stats-confirm">
                  <span className="stats-confirm-label">
                    <Trans>Isso vai apagar todo o progresso. Tem certeza?</Trans>
                  </span>
                  <div className="stats-confirm-actions">
                    <button type="button" className="btn btn-danger" onClick={clearProgress}>
                      <Trans>Sim, limpar</Trans>
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>
                      <Trans>Cancelar</Trans>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {progress.total === 0 && (
            <div className="stats-empty">
              <Trans>
                Nenhum versículo estudado ainda.
                <br />
                Comece a revisar para ver seu progresso aqui.
              </Trans>
            </div>
          )}
        </>
      )}

      {tab === 'versiculos' && <MemorizedVersesTab />}
      {tab === 'ranking' && <RankingTab />}
    </div>
  )
}

const StreakCalendar = memo(function StreakCalendar({ reviewDays, locale }: { reviewDays: Map<string, number>; locale: string }) {
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
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short' })
    cells.forEach((cell, ci) => {
      const m = cell.date.getMonth()
      if (m !== lastMonth) {
        labels.push({ label: fmt.format(cell.date), cellIndex: ci })
        lastMonth = m
      }
    })
    return labels
  }, [cells, locale])

  const dayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    // Jan 2, 2000 is a Sunday
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2000, 0, 2 + i)))
  }, [locale])

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
    return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="streak-calendar">
      <h3>
        <Trans>Calendário de Revisões</Trans>
      </h3>
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
            {dayLabels.map((d) => (
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
                    title={`${formatDate(cell.date)} — ${plural(cell.count, { one: '# revisão', other: '# revisões' })}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="sc-legend">
          <span>
            <Trans>Menos</Trans>
          </span>
          <div className="sc-cell" />
          <div className="sc-cell level-1" />
          <div className="sc-cell level-2" />
          <div className="sc-cell level-3" />
          <div className="sc-cell level-4" />
          <span>
            <Trans>Mais</Trans>
          </span>
        </div>
      </div>
    </div>
  )
})
