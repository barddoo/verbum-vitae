import { describe, expect, it } from 'vitest'
import { lastReviewedAt, type Progress } from './db'

function row(overrides: Partial<Progress>): Progress {
  return {
    verseId: 'b:1:1:1',
    translation: 'acf',
    cardJson: '{}',
    state: 0,
    dueDate: 0,
    streak: 0,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  }
}

describe('lastReviewedAt', () => {
  it('uses lastReview when the row has one', () => {
    expect(lastReviewedAt(row({ lastReview: 123, state: 2 }))).toBe(123)
  })

  it('returns the stamp even when it is older than updatedAt', () => {
    expect(lastReviewedAt(row({ lastReview: 1, updatedAt: 999, state: 2 }))).toBe(1)
  })

  it('returns null for a verse added but never reviewed', () => {
    expect(lastReviewedAt(row({ state: 0 }))).toBeNull()
  })

  it('falls back to updatedAt on legacy rows that left the New state', () => {
    expect(lastReviewedAt(row({ state: 1, updatedAt: 555 }))).toBe(555)
    expect(lastReviewedAt(row({ state: 2, updatedAt: 555 }))).toBe(555)
    expect(lastReviewedAt(row({ state: 3, updatedAt: 555 }))).toBe(555)
  })

  it('trusts an explicit zero stamp over the legacy fallback', () => {
    expect(lastReviewedAt(row({ lastReview: 0, state: 0 }))).toBe(0)
  })
})
