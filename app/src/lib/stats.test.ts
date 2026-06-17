import { describe, expect, it } from 'vitest'
import { computeStreak } from './stats'

describe('computeStreak', () => {
  it('returns 0 for empty timestamps array', () => {
    expect(computeStreak([])).toBe(0)
  })

  it('returns 1 for a single timestamp from today', () => {
    const today = Date.now()
    expect(computeStreak([today])).toBe(1)
  })

  it('returns 2 for today and yesterday', () => {
    const today = Date.now()
    const yesterday = today - 86400000
    expect(computeStreak([today, yesterday])).toBe(2)
  })

  it('returns 3 for 3 consecutive days', () => {
    const today = Date.now()
    const yesterday = today - 86400000
    const twoDaysAgo = today - 2 * 86400000
    expect(computeStreak([today, yesterday, twoDaysAgo])).toBe(3)
  })

  it('breaks streak on gap', () => {
    const today = Date.now()
    const yesterday = today - 86400000
    const fourDaysAgo = today - 4 * 86400000
    expect(computeStreak([today, yesterday, fourDaysAgo])).toBe(2)
  })

  it('returns 0 when no recent activity (no yesterday or today)', () => {
    const fiveDaysAgo = Date.now() - 5 * 86400000
    const sixDaysAgo = Date.now() - 6 * 86400000
    expect(computeStreak([fiveDaysAgo, sixDaysAgo])).toBe(0)
  })
})
