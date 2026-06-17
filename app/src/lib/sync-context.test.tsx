import { describe, expect, it } from 'vitest'
import { formatTimeAgo } from './sync-context'

describe('formatTimeAgo', () => {
  it('returns "agora" for less than 1 minute', () => {
    const now = Date.now()
    expect(formatTimeAgo(now)).toBe('agora')
    expect(formatTimeAgo(now - 30000)).toBe('agora')
  })

  it('returns "1 min" for exactly 1 minute', () => {
    const ts = Date.now() - 60000
    expect(formatTimeAgo(ts)).toBe('1 min')
  })

  it('returns "N min" for minutes under 60', () => {
    const ts = Date.now() - 5 * 60000
    expect(formatTimeAgo(ts)).toBe('5 min')
    const ts2 = Date.now() - 59 * 60000
    expect(formatTimeAgo(ts2)).toBe('59 min')
  })

  it('returns "1h" for exactly 1 hour', () => {
    const ts = Date.now() - 60 * 60000
    expect(formatTimeAgo(ts)).toBe('1h')
  })

  it('returns "NhMmin" for hours with remaining minutes', () => {
    const ts = Date.now() - 90 * 60000
    expect(formatTimeAgo(ts)).toBe('1h30min')
  })

  it('returns "Nh" for exact hours', () => {
    const ts = Date.now() - 3 * 60 * 60000
    expect(formatTimeAgo(ts)).toBe('3h')
  })
})
