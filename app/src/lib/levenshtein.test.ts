import { describe, expect, it } from 'vitest'
import { isNearMiss, levenshtein, normalizeForComparison } from './levenshtein'

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('hello', 'hello')).toBe(0)
  })

  it('returns 0 for two empty strings', () => {
    expect(levenshtein('', '')).toBe(0)
  })

  it('returns length of b when a is empty', () => {
    expect(levenshtein('', 'abc')).toBe(3)
  })

  it('returns length of a when b is empty', () => {
    expect(levenshtein('abc', '')).toBe(3)
  })

  it('returns 1 for single character substitution', () => {
    expect(levenshtein('cat', 'bat')).toBe(1)
  })

  it('returns correct distance for insertion', () => {
    expect(levenshtein('cat', 'cats')).toBe(1)
  })

  it('returns correct distance for deletion', () => {
    expect(levenshtein('cats', 'cat')).toBe(1)
  })

  it('returns correct distance for multiple edits', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
  })

  it('is case-sensitive', () => {
    expect(levenshtein('Cat', 'cat')).toBe(1)
  })

  it('handles accented characters', () => {
    expect(levenshtein('coração', 'coração')).toBe(0)
    expect(levenshtein('coracao', 'coração')).toBe(2)
  })
})

describe('normalizeForComparison', () => {
  it('strips diacritics and lowercases', () => {
    expect(normalizeForComparison('Coração')).toBe('coracao')
    expect(normalizeForComparison('À-ÿ')).toBe('ay')
  })

  it('strips punctuation but keeps letters and digits', () => {
    expect(normalizeForComparison('João 3:16, "amém"')).toBe('joao316amem')
  })
})

describe('isNearMiss', () => {
  it('matches identical and accent-agnostic words', () => {
    expect(isNearMiss('amor', 'amor')).toBe(true)
    expect(isNearMiss('coração', 'coracao')).toBe(true)
  })

  it('forgives a single substitution on short words', () => {
    expect(isNearMiss('casa', 'cara')).toBe(true)
  })

  it('does not forgive two edits on short words', () => {
    expect(isNearMiss('casa', 'mesa')).toBe(false)
  })

  it('forgives two edits on words over 7 chars', () => {
    expect(isNearMiss('testemunho', 'testemunhau')).toBe(true)
  })
})
