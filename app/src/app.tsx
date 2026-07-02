import { I18nProvider } from '@lingui/react'
import { RouterProvider } from '@tanstack/react-router'
import { AuthProvider } from './lib/auth'
import { i18n } from './lib/locale'
import { PresenceProvider } from './lib/presence-context'
import { SyncProvider } from './lib/sync-context'
import { ThemeProvider } from './lib/theme'
import { router } from './router'

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SyncProvider>
          <PresenceProvider>
            <I18nProvider i18n={i18n}>
              <RouterProvider router={router} />
            </I18nProvider>
          </PresenceProvider>
        </SyncProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
