// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { VerseImageControls } from './verse-image-controls'

function render(props: Partial<Parameters<typeof VerseImageControls>[0]> = {}) {
  const onChange = vi.fn()
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() =>
    root.render(
      <VerseImageControls
        format="story"
        font="body"
        align="center"
        fontScale={1}
        blur={4}
        brightness={0.9}
        showFilters={false}
        onChange={onChange}
        {...props}
      />,
    ),
  )
  return { container, root, onChange }
}

describe('VerseImageControls', () => {
  it('renders all control groups', () => {
    const { container, root } = render()
    expect(container.textContent).toContain('Formato')
    expect(container.textContent).toContain('Fonte')
    expect(container.textContent).toContain('Alinhamento')
    expect(container.textContent).toContain('Tamanho')
    act(() => root.unmount())
  })

  it('toggles format', () => {
    const { container, root, onChange } = render()
    const btn = container.querySelector('[aria-label="Formato"] .segmented-btn:first-child') as HTMLButtonElement
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    act(() => btn.click())
    expect(onChange).toHaveBeenCalledWith({ format: 'square' })
    act(() => root.unmount())
  })

  it('toggles font', () => {
    const { container, root, onChange } = render()
    const btn = container.querySelector('[aria-label="Fonte"] .segmented-btn:last-child') as HTMLButtonElement
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    act(() => btn.click())
    expect(onChange).toHaveBeenCalledWith({ font: 'display' })
    act(() => root.unmount())
  })

  it('toggles alignment', () => {
    const { container, root, onChange } = render()
    const btn = container.querySelector('[aria-label="Alinhamento"] .segmented-btn:first-child') as HTMLButtonElement
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    act(() => btn.click())
    expect(onChange).toHaveBeenCalledWith({ align: 'left' })
    act(() => root.unmount())
  })

  it('renders font scale slider with correct default', () => {
    const { container, root } = render()
    const slider = container.querySelector('#verse-image-size') as HTMLInputElement
    expect(slider).not.toBeNull()
    expect(slider.value).toBe('1')
    expect(slider.min).toBe('0.7')
    expect(slider.max).toBe('1.4')
    expect(slider.step).toBe('0.05')
    act(() => root.unmount())
  })

  it('shows filters when showFilters is true', () => {
    const { container, root } = render({ showFilters: true })
    expect(container.querySelector('#verse-image-blur')).not.toBeNull()
    expect(container.querySelector('#verse-image-brightness')).not.toBeNull()
    act(() => root.unmount())
  })

  it('hides filters when showFilters is false', () => {
    const { container, root } = render({ showFilters: false })
    expect(container.querySelector('#verse-image-blur')).toBeNull()
    expect(container.querySelector('#verse-image-brightness')).toBeNull()
    act(() => root.unmount())
  })
})
