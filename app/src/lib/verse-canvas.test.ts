// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { GRADIENTS } from './verse-backgrounds'
import { renderVerseCard, toBlob } from './verse-canvas'

const makeOpts = (overrides: Record<string, unknown> = {}) => ({
  verses: [{ ref: 'Gênesis 1:1', text: 'No princípio criou Deus os céus e a terra.' }],
  translation: 'NVI',
  format: 'square' as const,
  background: GRADIENTS[0],
  font: 'body' as const,
  align: 'center' as const,
  fontScale: 1,
  blur: 0,
  brightness: 1,
  ...overrides,
})

describe('renderVerseCard', () => {
  it('sets square dimensions', async () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return // skip if canvas not available
    await renderVerseCard(canvas, makeOpts())
    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(1080)
  })

  it('sets story dimensions', async () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    await renderVerseCard(canvas, makeOpts({ format: 'story' }))
    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(1920)
  })

  it('handles multi-verse', async () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    await renderVerseCard(
      canvas,
      makeOpts({
        verses: [
          { ref: 'Gênesis 1:1', text: 'No princípio criou Deus os céus e a terra.' },
          { ref: 'Gênesis 1:2', text: 'E a terra era sem forma e vazia.' },
        ],
        translation: 'ARA',
        background: GRADIENTS[2],
      }),
    )
    expect(canvas.width).toBe(1080)
    expect(canvas.height).toBe(1080)
  })
})

describe('toBlob', () => {
  it('returns a PNG blob when canvas is available', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    if (!ctx) return // skip
    const blob = await toBlob(canvas)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
  }, 5000)
})
