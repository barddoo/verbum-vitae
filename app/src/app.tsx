import { RouterProvider } from '@tanstack/react-router'
import { AuthProvider } from './lib/auth'
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
            <RouterProvider router={router} />
          </PresenceProvider>
        </SyncProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
