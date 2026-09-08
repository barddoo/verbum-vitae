// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { act, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cachedRemove } from './storage'
import { ThemeProvider, useTheme } from './theme'

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

function Probe() {
  const { themePref, theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="pref">{themePref}</span>
      <span data-testid="theme">{theme}</span>
      <button type="button" onClick={() => setTheme('light')}>
        light
      </button>
      <button type="button" onClick={() => setTheme('dark')}>
        dark
      </button>
      <button type="button" onClick={() => setTheme('system')}>
        system
      </button>
    </div>
  )
}

function renderTheme(children: ReactNode = <Probe />) {
  return render(<ThemeProvider>{children}</ThemeProvider>)
}

function themeOf(el: HTMLElement) {
  return {
    pref: el.querySelector('[data-testid="pref"]')?.textContent,
    theme: el.querySelector('[data-testid="theme"]')?.textContent,
  }
}

function btn(root: HTMLElement, name: string) {
  const button = [...root.querySelectorAll('button')].find((b) => b.textContent === name)
  if (!button) throw new Error(`button ${name} not found`)
  return button
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    cachedRemove('theme')
    localStorage.clear()
    stubMatchMedia(false)
    delete document.documentElement.dataset.theme
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('defaults to system and resolves dark when the OS prefers dark', () => {
    const { container } = renderTheme()
    expect(themeOf(container)).toEqual({ pref: 'system', theme: 'dark' })
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('theme')).toBeNull()
  })

  it('follows the OS scheme when set to system', () => {
    stubMatchMedia(true)
    const { container } = renderTheme()
    expect(themeOf(container)).toEqual({ pref: 'system', theme: 'light' })
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('pins an explicit theme via setTheme', () => {
    const { container } = renderTheme()
    act(() => btn(container, 'light').click())
    expect(themeOf(container)).toEqual({ pref: 'light', theme: 'light' })
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('returns to system and to OS resolution after an explicit choice', () => {
    const { container } = renderTheme()
    act(() => btn(container, 'dark').click())
    expect(document.documentElement.dataset.theme).toBe('dark')
    act(() => btn(container, 'system').click())
    expect(themeOf(container)).toEqual({ pref: 'system', theme: 'dark' })
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
