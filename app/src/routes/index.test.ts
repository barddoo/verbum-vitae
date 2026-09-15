import { describe, expect, it } from 'vitest'
import { streakMessage } from '../lib/streak-message'

describe('streakMessage', () => {
  it('day 1 — first day message', () => {
    expect(streakMessage(1)).toBe('Primeiro dia — continue assim!')
  })

  it('day 2 — good start (lower boundary)', () => {
    expect(streakMessage(2)).toBe('2 dias seguidos — bom começo!')
  })

  it('day 6 — good start (upper boundary, still < 7)', () => {
    expect(streakMessage(6)).toBe('6 dias seguidos — bom começo!')
  })

  it('day 7 — keep it up (lower boundary)', () => {
    expect(streakMessage(7)).toBe('7 dias seguidos — continue assim!')
  })

  it('day 29 — keep it up (upper boundary, still < 30)', () => {
    expect(streakMessage(29)).toBe('29 dias seguidos — continue assim!')
  })

  it('day 30 — impressive (lower boundary)', () => {
    expect(streakMessage(30)).toBe('30 dias seguidos — impressionante!')
  })

  it('day 100 — impressive', () => {
    expect(streakMessage(100)).toBe('100 dias seguidos — impressionante!')
  })
})
