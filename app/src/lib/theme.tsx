import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useState } from 'react'
import { cachedGet, cachedSet } from './storage'

export type ThemePref = 'light' | 'dark' | 'system'
export type Theme = 'light' | 'dark'

const LIGHT_COLOR = '#f9f4f2'
const DARK_COLOR = '#1c1b1a'

function isThemePref(value: unknown): value is ThemePref {
  return value === 'light' || value === 'dark' || value === 'system'
}

function systemPrefersLight(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: light)').matches
}

function getStoredPref(): ThemePref {
  const stored = cachedGet('theme')
  return isThemePref(stored) ? stored : 'system'
}

function applyWeb(theme: Theme) {
  document.documentElement.dataset.theme = theme
  const content = theme === 'light' ? LIGHT_COLOR : DARK_COLOR
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = content
  }
}

/** Match native status/navigation bar content to the resolved theme. */
function applyNativeBars(theme: Theme) {
  if (!Capacitor.isNativePlatform()) return
  const dark = theme === 'dark'
  SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {})
}

interface ThemeContextValue {
  themePref: ThemePref
  /** Resolved theme after applying the OS scheme when the pref is "system". */
  theme: Theme
  setTheme: (pref: ThemePref) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePref, setThemePrefState] = useState<ThemePref>(getStoredPref)
  const [systemIsLight, setSystemIsLight] = useState<boolean>(systemPrefersLight)

  const theme: Theme = themePref === 'system' ? (systemIsLight ? 'light' : 'dark') : themePref

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = (e: MediaQueryListEvent) => setSystemIsLight(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    applyWeb(theme)
    applyNativeBars(theme)
  }, [theme])

  const setTheme = useCallback((pref: ThemePref) => {
    cachedSet('theme', pref)
    setThemePrefState(pref)
  }, [])

  const value = useMemo(() => ({ themePref, theme, setTheme }), [themePref, theme, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = use(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
