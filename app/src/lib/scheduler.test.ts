import { describe, expect, it } from 'vitest'
import { getNextCard, Rating } from './scheduler'
import { createEmptyCard } from './srs'

describe('getNextCard', () => {
  it('returns card, log, dueDate, and state for each rating', () => {
    const card = createEmptyCard()

    for (const rating of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
      const result = getNextCard(card, rating)
      expect(result.card).toBeDefined()
      expect(result.log).toBeDefined()
      expect(typeof result.dueDate).toBe('number')
      expect([0, 1, 2, 3]).toContain(result.state)
    }
  })

  it('different ratings produce different due dates', () => {
    const card = createEmptyCard()
    const again = getNextCard(card, Rating.Again)
    const good = getNextCard(card, Rating.Good)
    expect(again.dueDate).not.toBe(good.dueDate)
  })

  it('rating Again returns learning state (1)', () => {
    const card = createEmptyCard()
    const result = getNextCard(card, Rating.Again)
    expect(result.state).toBe(1)
  })
})
