import './styles/fonts.css'
import { App as CapApp } from '@capacitor/app'
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { syncNow } from './lib/sync'
import { router } from './router'
import './styles/index.css'

function nativeBarsDark(): boolean {
  const pref = localStorage.getItem('theme')
  if (pref === 'light') return false
  if (pref === 'dark') return true
  return !window.matchMedia('(prefers-color-scheme: light)').matches
}

if (Capacitor.isNativePlatform()) {
  const barsDark = nativeBarsDark()
  StatusBar.setStyle({ style: barsDark ? Style.Dark : Style.Light }).catch(() => {})
  SystemBars.setStyle({ style: barsDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
  Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {})

  CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) syncNow()
  })

  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
      CapApp.exitApp()
    }
  })

  CapApp.addListener('appUrlOpen', (data) => {
    try {
      const url = new URL(data.url)
      const match = url.pathname.match(/^\/browse\/(\d+)\/(\d+)$/)
      if (match) {
        router.navigate({ to: '/browse', search: { book: match[1], chapter: match[2] } })
      }
    } catch {
      /* invalid URL, ignore */
    }
  })
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (Capacitor.isNativePlatform()) {
  SplashScreen.hide()
}
