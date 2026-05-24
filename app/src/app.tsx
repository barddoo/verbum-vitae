import { RouterProvider } from '@tanstack/react-router'
import { AuthProvider } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import { router } from './router'

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}
