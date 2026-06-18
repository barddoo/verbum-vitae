import '@fontsource-variable/fraunces'
import '@fontsource-variable/nunito'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { syncNow } from './lib/sync'
import { router } from './router'
import './styles/index.css'

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
  StatusBar.setBackgroundColor({ color: '#0f1117' }).catch(() => {})

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
