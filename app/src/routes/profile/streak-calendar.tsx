import { plural } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { memo, useMemo } from 'react'

export const StreakCalendar = memo(function StreakCalendar({ reviewDays, locale }: { reviewDays: Map<string, number>; locale: string }) {
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
