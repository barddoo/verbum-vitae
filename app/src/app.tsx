import { RouterProvider } from '@tanstack/react-router'
import { AuthProvider } from './lib/auth'
import { SyncProvider } from './lib/sync-context'
import { ThemeProvider } from './lib/theme'
import { router } from './router'

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SyncProvider>
          <RouterProvider router={router} />
        </SyncProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
