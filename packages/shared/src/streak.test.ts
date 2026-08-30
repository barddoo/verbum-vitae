import { describe, expect, it } from 'vitest'
import { computeStreak } from './streak'

const DAY = 86400000

describe('computeStreak', () => {
  it('returns 0 for empty timestamps array', () => {
    expect(computeStreak([])).toBe(0)
  })

  it('returns 1 for a single timestamp from today', () => {
    expect(computeStreak([Date.now()])).toBe(1)
  })

  it('returns 2 for today and yesterday', () => {
    const today = Date.now()
    expect(computeStreak([today, today - DAY])).toBe(2)
  })

  it('returns 3 for 3 consecutive days', () => {
    const today = Date.now()
    expect(computeStreak([today, today - DAY, today - 2 * DAY])).toBe(3)
  })

  it('breaks streak on gap', () => {
    const today = Date.now()
    expect(computeStreak([today, today - DAY, today - 4 * DAY])).toBe(2)
  })

  it('returns 0 when no recent activity (no yesterday or today)', () => {
    const now = Date.now()
    expect(computeStreak([now - 5 * DAY, now - 6 * DAY])).toBe(0)
  })

  it('keeps the streak alive when today has no activity yet', () => {
    const now = Date.now()
    expect(computeStreak([now - DAY, now - 2 * DAY, now - 3 * DAY])).toBe(3)
  })

  it('ignores null and undefined entries', () => {
    const today = Date.now()
    expect(computeStreak([today, null, today - DAY, undefined])).toBe(2)
  })

  it('accepts date strings alongside timestamps', () => {
    const today = new Date()
    const yesterday = new Date(Date.now() - DAY)
    expect(computeStreak([today.toISOString(), yesterday.toISOString()])).toBe(2)
  })

  it('counts a day once when it has several reviews', () => {
    const today = Date.now()
    expect(computeStreak([today, today - 1000, today - 2000])).toBe(1)
  })
})
