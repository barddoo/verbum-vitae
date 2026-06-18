// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { GRADIENTS } from '../../lib/verse-backgrounds'
import { BackgroundCarousel } from './background-carousel'

const TEST_BGS = [
  { kind: 'photo' as const, id: 'test-photo', thumb: '/bg/test-thumb.webp', full: '/bg/test.webp', name: 'Test Photo' },
  ...GRADIENTS.slice(0, 2),
]

function render(props: Partial<Parameters<typeof BackgroundCarousel>[0]> = {}) {
  const onSelect = vi.fn()
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(<BackgroundCarousel backgrounds={TEST_BGS} selectedId="test-photo" onSelect={onSelect} {...props} />))
  return { container, root, onSelect }
}

describe('BackgroundCarousel', () => {
  it('renders upload tile', () => {
    const { container, root } = render()
    expect(container.textContent).toContain('Minha foto')
    act(() => root.unmount())
  })

  it('renders all backgrounds', () => {
    const { container, root } = render()
    const tiles = container.querySelectorAll('.bg-tile')
    expect(tiles.length).toBe(TEST_BGS.length + 1) // +1 for upload tile
    act(() => root.unmount())
  })

  it('marks selected tile as active', () => {
    const { container, root } = render()
    const active = container.querySelector('.bg-tile.active')
    expect(active).not.toBeNull()
    expect(active?.getAttribute('aria-label')).toBe('Test Photo')
    act(() => root.unmount())
  })

  it('calls onSelect when clicking a tile', () => {
    const { container, root, onSelect } = render()
    const tiles = container.querySelectorAll('.bg-tile')
    const gradientTile = tiles[2] as HTMLButtonElement // after upload + photo
    act(() => gradientTile.click())
    expect(onSelect).toHaveBeenCalledWith(GRADIENTS[0])
    act(() => root.unmount())
  })

  it('calls onSelect with gradient', () => {
    const { container, root, onSelect } = render()
    const tiles = container.querySelectorAll('.bg-tile')
    const gradientTile = tiles[tiles.length - 1] as HTMLButtonElement
    act(() => gradientTile.click())
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ kind: 'gradient' }))
    act(() => root.unmount())
  })

  it('renders with empty backgrounds', () => {
    const onSelect = vi.fn()
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<BackgroundCarousel backgrounds={[]} selectedId="" onSelect={onSelect} />))
    expect(container.querySelector('.bg-tile-upload')).not.toBeNull()
    act(() => root.unmount())
  })
})
