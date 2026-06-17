import { describe, expect, it } from 'vitest'
import { CHAR_TO_TEXT_SOURCE_TYPE, TEXT_SOURCE_TYPE_CHAR } from './texts'

describe('text source type mappings', () => {
  it('TEXT_SOURCE_TYPE_CHAR maps all types to single chars', () => {
    expect(TEXT_SOURCE_TYPE_CHAR.bible).toBe('b')
    expect(TEXT_SOURCE_TYPE_CHAR.creed).toBe('c')
    expect(TEXT_SOURCE_TYPE_CHAR.catechism).toBe('k')
  })

  it('CHAR_TO_TEXT_SOURCE_TYPE maps all chars back to types', () => {
    expect(CHAR_TO_TEXT_SOURCE_TYPE.b).toBe('bible')
    expect(CHAR_TO_TEXT_SOURCE_TYPE.c).toBe('creed')
    expect(CHAR_TO_TEXT_SOURCE_TYPE.k).toBe('catechism')
  })

  it('bidirectional mapping is consistent', () => {
    for (const [type, char] of Object.entries(TEXT_SOURCE_TYPE_CHAR)) {
      expect(CHAR_TO_TEXT_SOURCE_TYPE[char]).toBe(type)
    }
  })

  it('CHAR_TO_TEXT_SOURCE_TYPE and TEXT_SOURCE_TYPE_CHAR have same keys/values swapped', () => {
    const typeCount = Object.keys(TEXT_SOURCE_TYPE_CHAR).length
    const charCount = Object.keys(CHAR_TO_TEXT_SOURCE_TYPE).length
    expect(typeCount).toBe(charCount)
  })
})
