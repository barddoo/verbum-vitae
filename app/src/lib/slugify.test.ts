import { describe, expect, it } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('lowercases input', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world')
  })

  it('collapses multiple spaces into single hyphen', () => {
    expect(slugify('hello   world')).toBe('hello-world')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify(' hello world ')).toBe('hello-world')
  })

  it('removes accents from Portuguese text', () => {
    expect(slugify('oração')).toBe('oracao')
    expect(slugify('coração')).toBe('coracao')
    expect(slugify('Não')).toBe('nao')
    expect(slugify('céu')).toBe('ceu')
  })

  it('removes special characters', () => {
    expect(slugify('hello@world.com')).toBe('hello-world-com')
  })

  it('handles numbers', () => {
    expect(slugify('Psalm 119')).toBe('psalm-119')
  })

  it('collapses consecutive special chars into single hyphen', () => {
    expect(slugify('hello!@#world')).toBe('hello-world')
  })

  it('returns empty string for input with only special chars', () => {
    expect(slugify('!@#$%')).toBe('')
  })

  it('handles empty input', () => {
    expect(slugify('')).toBe('')
  })
})
