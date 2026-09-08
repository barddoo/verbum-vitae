import { describe, expect, it } from 'vitest'
import { dailyTip, TIP_GROUPS } from './memorization-tips'

const ALL_TEXTS = TIP_GROUPS.flatMap((group) => group.tips.map((tip) => tip.text))

describe('memorization tips data', () => {
  it('has four non-empty groups with well-formed tips', () => {
    expect(TIP_GROUPS.length).toBeGreaterThanOrEqual(4)
    for (const group of TIP_GROUPS) {
      expect(group.id).toBeTruthy()
      expect(group.title).toBeTruthy()
      expect(group.tips.length).toBeGreaterThan(0)
      for (const tip of group.tips) {
        expect(tip.title).toBeTruthy()
        expect(tip.text).toBeTruthy()
      }
    }
  })

  it('dailyTip is deterministic for a given date', () => {
    const date = new Date(2026, 0, 15, 12, 0, 0)
    expect(dailyTip(date)).toEqual(dailyTip(new Date(2026, 0, 15, 23, 59, 0)))
  })

  it('dailyTip always returns a tip from the groups', () => {
    for (let day = 0; day < 500; day++) {
      const tip = dailyTip(new Date(2026, 0, 1 + day))
      expect(ALL_TEXTS).toContain(tip.text)
    }
  })
})
