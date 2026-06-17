import { describe, expect, it } from 'vitest'
import { createEmptyCard, getDueCards, isLearningOrRelearning, parseCardJson, stateFromCard } from './srs'

describe('createEmptyCard', () => {
  it('creates a card with initial values', () => {
    const now = new Date('2026-01-01')
    const card = createEmptyCard(now)
    expect(card.due).toEqual(now)
    expect(card.stability).toBe(0)
    expect(card.difficulty).toBe(0)
    expect(card.elapsed_days).toBe(0)
    expect(card.scheduled_days).toBe(0)
    expect(card.reps).toBe(0)
    expect(card.lapses).toBe(0)
    expect(card.state).toBe(0)
    expect(card.last_review).toBeUndefined()
  })

  it('defaults to current date', () => {
    const card = createEmptyCard()
    expect(card.due).toBeInstanceOf(Date)
  })
})

describe('parseCardJson', () => {
  it('parses valid card JSON', () => {
    const now = new Date()
    const json = JSON.stringify(createEmptyCard(now))
    const card = parseCardJson(json)
    expect(card.state).toBe(0)
    expect(card.due).toBeInstanceOf(Date)
  })

  it('converts string dates to Date objects', () => {
    const card = parseCardJson(JSON.stringify({ due: '2026-01-01T00:00:00.000Z', state: 0 }))
    expect(card.due).toBeInstanceOf(Date)
    expect(card.due.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('sets last_review to undefined when falsy', () => {
    const card = parseCardJson(JSON.stringify({ due: '2026-01-01T00:00:00.000Z', state: 0 }))
    expect(card.last_review).toBeUndefined()
  })
})

describe('getDueCards', () => {
  it('returns empty array for empty list', () => {
    expect(getDueCards([])).toEqual([])
  })

  it('returns cards due now', () => {
    const now = new Date()
    const past = new Date(now.getTime() - 1000)
    const card = createEmptyCard(past)
    const result = getDueCards([{ verseId: 'v1', cardJson: JSON.stringify(card) }], now)
    expect(result).toHaveLength(1)
    expect(result[0].verseId).toBe('v1')
  })

  it('skips cards due in future', () => {
    const now = new Date()
    const future = new Date(now.getTime() + 86400000)
    const card = createEmptyCard(future)
    const result = getDueCards([{ verseId: 'v1', cardJson: JSON.stringify(card) }], now)
    expect(result).toHaveLength(0)
  })

  it('skips invalid JSON silently', () => {
    const result = getDueCards([{ verseId: 'v1', cardJson: 'not-json' }])
    expect(result).toEqual([])
  })

  it('sorts by due date ascending', () => {
    const now = Date.now()
    const early = createEmptyCard(new Date(now - 2000))
    const late = createEmptyCard(new Date(now - 1000))
    const result = getDueCards(
      [
        { verseId: 'late', cardJson: JSON.stringify(late) },
        { verseId: 'early', cardJson: JSON.stringify(early) },
      ],
      new Date(now),
    )
    expect(result[0].verseId).toBe('early')
    expect(result[1].verseId).toBe('late')
  })
})

describe('stateFromCard', () => {
  it('returns 0 for state 0', () => {
    expect(stateFromCard({ state: 0 } as any)).toBe(0)
  })

  it('returns 1 for state 1', () => {
    expect(stateFromCard({ state: 1 } as any)).toBe(1)
  })

  it('returns 2 for state 2', () => {
    expect(stateFromCard({ state: 2 } as any)).toBe(2)
  })

  it('returns 3 for state 3', () => {
    expect(stateFromCard({ state: 3 } as any)).toBe(3)
  })

  it('returns 0 for unknown state', () => {
    expect(stateFromCard({ state: 99 } as any)).toBe(0)
  })
})

describe('isLearningOrRelearning', () => {
  it('returns true for learning state (1)', () => {
    expect(isLearningOrRelearning({ state: 1 } as any)).toBe(true)
  })

  it('returns true for relearning state (3)', () => {
    expect(isLearningOrRelearning({ state: 3 } as any)).toBe(true)
  })

  it('returns false for new state (0)', () => {
    expect(isLearningOrRelearning({ state: 0 } as any)).toBe(false)
  })

  it('returns false for review state (2)', () => {
    expect(isLearningOrRelearning({ state: 2 } as any)).toBe(false)
  })
})
