// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cachedRemove } from '../../lib/storage'
import { ThemeProvider } from '../../lib/theme'
import { AppearanceSection } from './appearance-section'

function stubMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia
}

describe('AppearanceSection', () => {
  beforeEach(() => {
    cachedRemove('theme')
    localStorage.clear()
    stubMatchMedia(false)
    delete document.documentElement.dataset.theme
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function renderSection() {
    return render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>,
    )
  }

  function radio(value: string) {
    return screen.getByRole('radio', {
      name: new RegExp(`^${value === 'system' ? 'Sistema' : value === 'light' ? 'Claro' : 'Escuro'}`),
    }) as HTMLInputElement
  }

  it('defaults to the system option', () => {
    renderSection()
    expect(radio('system').checked).toBe(true)
    expect(radio('light').checked).toBe(false)
    expect(radio('dark').checked).toBe(false)
  })

  it('selecting light switches the theme, persists it and updates data-theme', () => {
    renderSection()
    fireEvent.click(radio('light'))
    expect(radio('light').checked).toBe(true)
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('selecting dark switches the theme and updates data-theme', () => {
    renderSection()
    fireEvent.click(radio('dark'))
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('returning to system follows the OS scheme again', () => {
    renderSection()
    fireEvent.click(radio('light'))
    expect(document.documentElement.dataset.theme).toBe('light')
    fireEvent.click(radio('system'))
    expect(localStorage.getItem('theme')).toBe('system')
    // OS is dark in this stub.
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
