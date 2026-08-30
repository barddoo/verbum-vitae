import { fsrs } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { getNextCard, Rating } from './scheduler'
import type { Grade } from './srs'
import { createEmptyCard } from './srs'

/** Grades a fresh card `reps` times with Good so its interval clears the 2.5-day fuzz floor. */
function matureCard(reps: number) {
  const unfuzzed = fsrs()
  let card = createEmptyCard(new Date('2026-01-01T00:00:00Z'))
  let at = new Date(card.due)
  for (let i = 0; i < reps; i++) {
    card = unfuzzed.next(card, at, Rating.Good).card
    at = new Date(card.due)
  }
  return { card, at }
}

describe('getNextCard', () => {
  it('returns card, log, dueDate, and state for each rating', () => {
    const card = createEmptyCard()

    for (const rating of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
      const result = getNextCard(card, rating as Grade)
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

  it('fuzzes mature intervals so same-day batches do not stay in lockstep', () => {
    // A collection added in one tap creates identical cards all due at the same instant. Without
    // fuzz they advance together forever, so the whole collection comes back as one wall.
    const unfuzzed = fsrs()
    let differing = 0

    for (let reps = 4; reps <= 8; reps++) {
      const { card, at } = matureCard(reps)
      const plain = unfuzzed.next(card, at, Rating.Good).card.due.getTime()
      if (getNextCard(card, Rating.Good, at).dueDate !== plain) differing++
    }

    expect(differing).toBeGreaterThan(0)
  })
})
