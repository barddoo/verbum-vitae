import { describe, expect, it } from 'vitest'
import { AVAILABLE_SOURCES } from './text-sources'

const VALID_TYPES = new Set(['bible', 'creed', 'catechism'])

describe('AVAILABLE_SOURCES', () => {
  it('has at least one source', () => {
    expect(AVAILABLE_SOURCES.length).toBeGreaterThan(0)
  })

  it('every source has required string fields', () => {
    for (const s of AVAILABLE_SOURCES) {
      expect(typeof s.type).toBe('string')
      expect(typeof s.id).toBe('string')
      expect(typeof s.name).toBe('string')
      expect(typeof s.sectionLabel).toBe('string')
      expect(typeof s.itemLabel).toBe('string')
      expect(s.name.length).toBeGreaterThan(0)
      expect(s.sectionLabel.length).toBeGreaterThan(0)
      expect(s.itemLabel.length).toBeGreaterThan(0)
    }
  })

  it('every source has a valid type', () => {
    for (const s of AVAILABLE_SOURCES) {
      expect(VALID_TYPES.has(s.type)).toBe(true)
    }
  })

  it('every source has sectionCount >= 1', () => {
    for (const s of AVAILABLE_SOURCES) {
      expect(s.sectionCount).toBeGreaterThanOrEqual(1)
    }
  })

  it('no duplicate source ids within the same type', () => {
    const seen = new Set<string>()
    for (const s of AVAILABLE_SOURCES) {
      const key = `${s.type}:${s.id}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })

  it('bible source has sectionCount === 66', () => {
    const bible = AVAILABLE_SOURCES.find((s) => s.type === 'bible')
    expect(bible).toBeDefined()
    expect(bible!.sectionCount).toBe(66)
  })

  it('heidelberg catechism has sectionCount === 1', () => {
    const hc = AVAILABLE_SOURCES.find((s) => s.id === 'heidelberg')
    expect(hc).toBeDefined()
    expect(hc!.sectionCount).toBe(1)
  })

  it('westminster catechism has sectionCount === 1', () => {
    const wc = AVAILABLE_SOURCES.find((s) => s.id === 'westminster')
    expect(wc).toBeDefined()
    expect(wc!.sectionCount).toBe(1)
  })

  it('creeds have sectionCount > 1', () => {
    const creeds = AVAILABLE_SOURCES.filter((s) => s.type === 'creed')
    expect(creeds.length).toBeGreaterThan(0)
    for (const c of creeds) {
      expect(c.sectionCount).toBeGreaterThan(1)
    }
  })

  it('first source is bible', () => {
    expect(AVAILABLE_SOURCES[0].type).toBe('bible')
  })
})
