import { describe, expect, it } from 'vitest'
import { formatRelativeDueDate, verseIdToReference } from './format'

describe('formatRelativeDueDate', () => {
  it('returns "Vence hoje" for today', () => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    expect(formatRelativeDueDate(today.getTime())).toBe('Vence hoje')
  })

  it('returns "Vence amanhã" for tomorrow', () => {
    const tomorrow = Date.now() + 86400000
    expect(formatRelativeDueDate(tomorrow)).toBe('Vence amanhã')
  })

  it('returns "Venceu ontem" for yesterday', () => {
    const yesterday = Date.now() - 86400000
    expect(formatRelativeDueDate(yesterday)).toBe('Venceu ontem')
  })

  it('returns "Vence em N dias" for future dates', () => {
    const future = Date.now() + 5 * 86400000
    expect(formatRelativeDueDate(future)).toBe('Vence em 5 dias')
  })

  it('returns "Venceu há N dias" for past dates beyond yesterday', () => {
    const past = Date.now() - 3 * 86400000
    expect(formatRelativeDueDate(past)).toBe('Venceu há 3 dias')
  })
})

describe('verseIdToReference', () => {
  it('formats bible verse reference', () => {
    const ref = verseIdToReference('b:42:3:16')
    expect(ref).toContain('João')
    expect(ref).toContain('3:16')
  })

  it('formats bible verse range', () => {
    const ref = verseIdToReference('b:42:3:16:17')
    expect(ref).toContain('João')
    expect(ref).toContain('3:16-17')
  })

  it('returns raw id for unknown book', () => {
    const ref = verseIdToReference('b:99:1:1')
    expect(ref).toBe('b:99:1:1')
  })

  it('formats catechism reference', () => {
    const ref = verseIdToReference('k:heidelberg:0:0')
    expect(ref).toContain('Catecismo de Heidelberg')
  })

  it('formats creed reference', () => {
    const ref = verseIdToReference('c:apostles:0:0')
    expect(ref).toContain('Credo Apostólico')
  })
})
