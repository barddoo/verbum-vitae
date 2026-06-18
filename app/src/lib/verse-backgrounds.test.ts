import { describe, expect, it } from 'vitest'
import { BACKGROUNDS, GRADIENTS, PHOTOS } from './verse-backgrounds'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

describe('PHOTOS', () => {
  it('has 23 entries', () => {
    expect(PHOTOS).toHaveLength(23)
  })

  it('all have kind "photo" and required fields', () => {
    for (const p of PHOTOS) {
      expect(p.kind).toBe('photo')
      expect(p.id).toBeTruthy()
      expect(p.thumb).toMatch(/^\/bg\//)
      expect(p.full).toMatch(/^\/bg\//)
      expect(p.name).toBeTruthy()
    }
  })

  it('has no duplicate IDs', () => {
    const ids = PHOTOS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('GRADIENTS', () => {
  it('has 10 entries', () => {
    expect(GRADIENTS).toHaveLength(10)
  })

  it('all have kind "gradient" and valid stops', () => {
    for (const g of GRADIENTS) {
      expect(g.kind).toBe('gradient')
      expect(g.id).toBeTruthy()
      expect(g.name).toBeTruthy()
      expect(g.stops).toHaveLength(2)
      expect(g.stops[0]).toMatch(HEX_COLOR)
      expect(g.stops[1]).toMatch(HEX_COLOR)
    }
  })

  it('has no duplicate IDs', () => {
    const ids = GRADIENTS.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('BACKGROUNDS', () => {
  it('has all photos before gradients', () => {
    const firstGradientIdx = BACKGROUNDS.findIndex((b) => b.kind === 'gradient')
    expect(firstGradientIdx).toBe(PHOTOS.length)
  })

  it('total count equals photos + gradients', () => {
    expect(BACKGROUNDS).toHaveLength(PHOTOS.length + GRADIENTS.length)
  })

  it('defaults to first entry', () => {
    expect(BACKGROUNDS[0].kind).toBe('photo')
    expect(BACKGROUNDS[0].id).toBe(PHOTOS[0].id)
  })
})
