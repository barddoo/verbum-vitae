import { describe, expect, it } from 'vitest'
import { cleanVerseText, parseTextKey, textKey, verseKey } from './db'

describe('textKey', () => {
  it('creates bible key without sourceId', () => {
    const key = textKey('bible', '', 42, 3, 16)
    expect(key).toBe('b:42:3:16')
  })

  it('creates bible key with end verse', () => {
    const key = textKey('bible', '', 42, 3, 16, 17)
    expect(key).toBe('b:42:3:16:17')
  })

  it('creates creed key with sourceId', () => {
    const key = textKey('creed', 'apostles', 0, 0, 1)
    expect(key).toBe('c:apostles:0:0:1')
  })

  it('creates catechism key with sourceId', () => {
    const key = textKey('catechism', 'heidelberg', 0, 0, 22)
    expect(key).toBe('k:heidelberg:0:0:22')
  })
})

describe('parseTextKey', () => {
  it('parses bible key', () => {
    const parsed = parseTextKey('b:42:3:16')
    expect(parsed.sourceType).toBe('bible')
    expect(parsed.sourceId).toBe('')
    expect(parsed.sectionIndex).toBe(42)
    expect(parsed.blockIndex).toBe(3)
    expect(parsed.itemIndex).toBe(16)
    expect(parsed.itemEnd).toBeUndefined()
  })

  it('parses bible key with range', () => {
    const parsed = parseTextKey('b:42:3:16:17')
    expect(parsed.itemIndex).toBe(16)
    expect(parsed.itemEnd).toBe(17)
  })

  it('parses creed key', () => {
    const parsed = parseTextKey('c:apostles:0:0:1')
    expect(parsed.sourceType).toBe('creed')
    expect(parsed.sourceId).toBe('apostles')
    expect(parsed.itemIndex).toBe(1)
  })

  it('parses catechism key', () => {
    const parsed = parseTextKey('k:heidelberg:0:0:22')
    expect(parsed.sourceType).toBe('catechism')
    expect(parsed.sourceId).toBe('heidelberg')
    expect(parsed.itemIndex).toBe(22)
  })

  it('round-trips: parseTextKey(textKey(...)) preserves values for bible', () => {
    const original = { sourceType: 'bible' as const, sourceId: '', section: 42, block: 3, item: 16 }
    const key = textKey(original.sourceType, original.sourceId, original.section, original.block, original.item)
    const parsed = parseTextKey(key)
    expect(parsed.sourceType).toBe(original.sourceType)
    expect(parsed.sourceId).toBe(original.sourceId)
    expect(parsed.sectionIndex).toBe(original.section)
    expect(parsed.blockIndex).toBe(original.block)
    expect(parsed.itemIndex).toBe(original.item)
  })

  it('round-trips: parseTextKey(textKey(...)) preserves values for creed', () => {
    const original = { sourceType: 'creed' as const, sourceId: 'apostles', section: 0, block: 0, item: 1 }
    const key = textKey(original.sourceType, original.sourceId, original.section, original.block, original.item)
    const parsed = parseTextKey(key)
    expect(parsed.sourceType).toBe(original.sourceType)
    expect(parsed.sourceId).toBe(original.sourceId)
    expect(parsed.itemIndex).toBe(original.item)
  })
})

describe('verseKey', () => {
  it('creates bible key from numbers', () => {
    const key = verseKey(42, 3, 16)
    expect(key).toBe('b:42:3:16')
  })

  it('creates bible key with end verse', () => {
    const key = verseKey(42, 3, 16, 17)
    expect(key).toBe('b:42:3:16:17')
  })
})

describe('cleanVerseText', () => {
  it("strips Strong's numbers from KJV text", () => {
    const raw = 'Every man376 of the children1121 of Israel3478 shall pitch2583 by his own standard1714.'
    expect(cleanVerseText(raw, 'kjv')).toBe('Every man of the children of Israel shall pitch by his own standard.')
  })

  it("removes standalone Strong's numbers and collapses spaces", () => {
    const raw = 'In the beginning7225 God430 created1254 853 the heaven8064 and853 the earth776.'
    expect(cleanVerseText(raw, 'kjv')).toBe('In the beginning God created the heaven and the earth.')
  })

  it('preserves apostrophes and punctuation', () => {
    const raw = "of their father's1 house1004: far off5048 about5439 the tabernacle168"
    expect(cleanVerseText(raw, 'kjv')).toBe("of their father's house: far off about the tabernacle")
  })

  it('does not strip numbers from non-KJV translations', () => {
    const raw = 'Aos 130 anos, Adão gerou um filho à sua semelhança.'
    expect(cleanVerseText(raw, 'nvi')).toBe(raw)
  })

  it('strips HTML tags from any translation', () => {
    const raw = '<S>Hello</S> world'
    expect(cleanVerseText(raw, 'kjv')).toBe('Hello world')
    expect(cleanVerseText(raw, 'nvi')).toBe('Hello world')
  })
})
