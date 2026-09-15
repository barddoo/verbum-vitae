// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StreakCalendar, buildMonthLabels } from './stats'

// ──────────────────────────────────────────────
// StreakCalendar rendering
// ──────────────────────────────────────────────

describe('StreakCalendar', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the section heading', () => {
    render(<StreakCalendar reviewDays={new Map()} />)
    expect(screen.getByRole('heading', { name: 'Calendário de Revisões' })).toBeTruthy()
  })

  it('renders all 7 day-of-week labels', () => {
    render(<StreakCalendar reviewDays={new Map()} />)
    for (const day of ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']) {
      expect(screen.getByText(day)).toBeTruthy()
    }
  })

  it('renders cell buttons with pt-BR aria-labels', () => {
    render(<StreakCalendar reviewDays={new Map()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    for (const btn of buttons) {
      expect(btn.getAttribute('aria-label')).toMatch(/revisões/)
    }
  })

  it('applies level class to cells that have activity', () => {
    const today = new Date().toDateString()
    const map = new Map([[today, 5]])
    const { container } = render(<StreakCalendar reviewDays={map} />)
    const active = container.querySelector('.sc-cell.level-1, .sc-cell.level-2, .sc-cell.level-3, .sc-cell.level-4')
    expect(active).toBeTruthy()
  })

  it('shows popover with count on cell click', () => {
    const today = new Date().toDateString()
    const map = new Map([[today, 3]])
    render(<StreakCalendar reviewDays={map} />)
    const btn = screen.getAllByRole('button').find((b) => b.getAttribute('aria-label')?.includes('3 revisões'))
    expect(btn).toBeTruthy()
    fireEvent.click(btn!)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText('3 revisões')).toBeTruthy()
  })

  it('shows "sem revisões" in popover for empty cell', () => {
    render(<StreakCalendar reviewDays={new Map()} />)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.getByText('sem revisões')).toBeTruthy()
  })

  it('closes popover on Escape', () => {
    render(<StreakCalendar reviewDays={new Map()} />)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.getByRole('status')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('toggles popover off on second click of same cell', () => {
    render(<StreakCalendar reviewDays={new Map()} />)
    const btn = screen.getAllByRole('button')[0]
    fireEvent.click(btn)
    expect(screen.getByRole('status')).toBeTruthy()
    fireEvent.click(btn)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('replaces popover when a different cell is clicked', () => {
    render(<StreakCalendar reviewDays={new Map()} />)
    const [first, second] = screen.getAllByRole('button')
    fireEvent.click(first)
    const firstLabel = screen.getByRole('status').querySelector('strong')?.textContent
    fireEvent.click(second)
    // Still one popover, but it shows the second cell's date
    expect(screen.getAllByRole('status')).toHaveLength(1)
    const secondLabel = screen.getByRole('status').querySelector('strong')?.textContent
    expect(secondLabel).not.toBe(firstLabel)
  })

  it('closes popover on mousedown outside', () => {
    render(<StreakCalendar reviewDays={new Map()} />)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.getByRole('status')).toBeTruthy()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('keeps popover open on mousedown inside the popover', () => {
    render(<StreakCalendar reviewDays={new Map()} />)
    fireEvent.click(screen.getAllByRole('button')[0])
    const popover = screen.getByRole('status')
    fireEvent.mouseDown(popover)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('date outside the 20-week range does not produce an active cell', () => {
    // 200 days ago is well outside the 20-week (140-day) window
    const old = new Date()
    old.setDate(old.getDate() - 200)
    const map = new Map([[old.toDateString(), 99]])
    const { container } = render(<StreakCalendar reviewDays={map} />)
    expect(container.querySelector('.sc-cell.level-4')).toBeNull()
  })

  it('single review makes the cell level-4 when it is the maximum', () => {
    const today = new Date().toDateString()
    const map = new Map([[today, 1]])
    const { container } = render(<StreakCalendar reviewDays={map} />)
    // maxCount = 1, ratio = 1/1 = 1.0 > 0.66 → level-4
    expect(container.querySelector('.sc-cell.level-4')).toBeTruthy()
  })

  it('count at exactly the 0.1 boundary gets level-1, not level-2', () => {
    // Set today = 1, another day = 10 → maxCount = 10, ratio for today = 0.1 (not > 0.1)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const map = new Map([
      [today.toDateString(), 1],
      [yesterday.toDateString(), 10],
    ])
    const { container } = render(<StreakCalendar reviewDays={map} />)
    const todayBtn = screen
      .getAllByRole('button')
      .find((b) => b.getAttribute('aria-label')?.includes('1 revisões') && !b.getAttribute('aria-label')?.includes('10'))
    expect(todayBtn?.className).toContain('level-1')
    expect(todayBtn?.className).not.toContain('level-2')
    // The day with 10 should be level-4
    const maxBtn = screen.getAllByRole('button').find((b) => b.getAttribute('aria-label')?.includes('10 revisões'))
    expect(maxBtn?.className).toContain('level-4')
  })

  it('shows singular "revisão" in popover for count of 1', () => {
    const today = new Date().toDateString()
    const map = new Map([[today, 1]])
    render(<StreakCalendar reviewDays={map} />)
    const btn = screen.getAllByRole('button').find((b) => b.getAttribute('aria-label')?.includes('1 revisões'))
    fireEvent.click(btn!)
    expect(screen.getByText('1 revisão')).toBeTruthy()
  })
})

// ──────────────────────────────────────────────
// buildMonthLabels edge cases
// ──────────────────────────────────────────────

describe('buildMonthLabels — edge cases', () => {
  it('handles year boundary (Dec → Jan)', () => {
    const cells = makeCells([
      ...daysFrom(date(2024, 12, 1), 31),
      ...daysFrom(date(2025, 1, 1), 31),
    ])
    const labels = buildMonthLabels(cells)
    expect(labels.map((l) => l.label)).toContain('Dez')
    expect(labels.map((l) => l.label)).toContain('Jan')
  })

  it('shows second month when gap is exactly 3 columns', () => {
    // First month: 21 cells → cols 0, 1, 2 (last col = 2). Second month starts at cellIndex 21 → col 3. Gap = 3 - 0 = 3 ≥ 3.
    const cells = makeCells([
      ...daysFrom(date(2025, 4, 1), 21),
      ...daysFrom(date(2025, 5, 1), 7),
    ])
    const labels = buildMonthLabels(cells)
    expect(labels.map((l) => l.label)).toContain('Mai')
  })

  it('skips second month when gap is exactly 2 columns', () => {
    // First month: 14 cells → cols 0, 1. Second month at cellIndex 14 → col 2. Gap = 2 < 3.
    const cells = makeCells([
      ...daysFrom(date(2025, 4, 25), 14),
      ...daysFrom(date(2025, 5, 9), 7),
    ])
    const labels = buildMonthLabels(cells)
    expect(labels.map((l) => l.label)).not.toContain('Mai')
  })

  it('handles a single cell', () => {
    const cells = makeCells([date(2025, 8, 15)])
    const labels = buildMonthLabels(cells)
    expect(labels).toHaveLength(1)
    expect(labels[0].label).toBe('Ago')
    expect(labels[0].cellIndex).toBe(0)
  })

  it('does not duplicate a label when the same month appears twice in sequence', () => {
    // All cells in July — should only produce one label
    const cells = makeCells(daysFrom(date(2025, 7, 1), 28))
    const labels = buildMonthLabels(cells)
    expect(labels.filter((l) => l.label === 'Jul')).toHaveLength(1)
  })
})

function makeCells(dates: Date[]): { date: Date }[] {
  return dates.map((date) => ({ date }))
}

// Use local-time constructor to avoid UTC offset shifting the month
function date(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day)
}

function daysFrom(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

describe('buildMonthLabels', () => {
  it('returns empty for empty cells', () => {
    expect(buildMonthLabels([])).toEqual([])
  })

  it('returns single label for single month', () => {
    const cells = makeCells(daysFrom(date(2025, 3, 1), 20))
    const labels = buildMonthLabels(cells)
    expect(labels).toHaveLength(1)
    expect(labels[0].label).toBe('Mar')
    expect(labels[0].cellIndex).toBe(0)
  })

  it('shows both months when they are at least 3 columns apart', () => {
    // Apr starts at col 0, May starts at cellIndex 30 → col 4 (gap = 4 >= 3)
    const cells = makeCells([
      ...daysFrom(date(2025, 4, 1), 30),
      ...daysFrom(date(2025, 5, 1), 10),
    ])
    const labels = buildMonthLabels(cells)
    expect(labels.map((l) => l.label)).toEqual(['Abr', 'Mai'])
  })

  it('skips a month label when fewer than 3 columns from the previous', () => {
    // Apr gets 7 cells (col 0 only), May starts at col 1 → gap = 1 < 3, skipped
    const cells = makeCells([
      ...daysFrom(date(2025, 4, 25), 7),
      ...daysFrom(date(2025, 5, 2), 14),
    ])
    const labels = buildMonthLabels(cells)
    expect(labels.map((l) => l.label)).toEqual(['Abr'])
  })

  it('shows all months when spread across many columns', () => {
    const cells = makeCells([
      ...daysFrom(date(2025, 1, 1), 31),
      ...daysFrom(date(2025, 2, 1), 28),
      ...daysFrom(date(2025, 3, 1), 31),
    ])
    const labels = buildMonthLabels(cells)
    expect(labels.map((l) => l.label)).toEqual(['Jan', 'Fev', 'Mar'])
  })

  it('cellIndex points to the first cell of that month', () => {
    const cells = makeCells([
      ...daysFrom(date(2025, 4, 1), 30),
      ...daysFrom(date(2025, 5, 1), 10),
    ])
    const labels = buildMonthLabels(cells)
    const mayLabel = labels.find((l) => l.label === 'Mai')
    expect(mayLabel?.cellIndex).toBe(30)
  })

  it('first label always shows even if it starts at col 0', () => {
    const cells = makeCells(daysFrom(date(2025, 6, 1), 5))
    const labels = buildMonthLabels(cells)
    expect(labels[0].label).toBe('Jun')
    expect(labels[0].cellIndex).toBe(0)
  })
})
