import { describe, expect, it } from 'vitest'
import { extractCardFields } from './sync'

describe('extractCardFields', () => {
  it('returns defaults for empty object', () => {
    const result = extractCardFields('{}')
    expect(result.ease).toBe(2.5)
    expect(result.intervalDays).toBe(0)
    expect(result.repetitions).toBe(0)
  })

  it('returns defaults for non-JSON string', () => {
    const result = extractCardFields('not-json')
    expect(result.ease).toBe(2.5)
    expect(result.intervalDays).toBe(0)
    expect(result.repetitions).toBe(0)
  })

  it('extracts difficulty as ease', () => {
    const result = extractCardFields(JSON.stringify({ difficulty: 3.0 }))
    expect(result.ease).toBe(3.0)
  })

  it('extracts scheduled_days as intervalDays', () => {
    const result = extractCardFields(JSON.stringify({ scheduled_days: 7 }))
    expect(result.intervalDays).toBe(7)
  })

  it('extracts reps as repetitions', () => {
    const result = extractCardFields(JSON.stringify({ reps: 5 }))
    expect(result.repetitions).toBe(5)
  })

  it('extracts all fields from valid card', () => {
    const result = extractCardFields(JSON.stringify({ difficulty: 2.8, scheduled_days: 14, reps: 3 }))
    expect(result.ease).toBe(2.8)
    expect(result.intervalDays).toBe(14)
    expect(result.repetitions).toBe(3)
  })

  it('returns defaults for undefined', () => {
    const result = extractCardFields(undefined)
    expect(result.ease).toBe(2.5)
    expect(result.intervalDays).toBe(0)
    expect(result.repetitions).toBe(0)
  })
})
