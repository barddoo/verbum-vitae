import { createRootRoute, createRoute, createRouter, Link, Outlet } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ThemeToggle } from './components/theme-toggle'
import { useAuth } from './lib/auth'
import { seedVerses } from './lib/db'
import { LoginPage } from './routes/auth.login'
import { RegisterPage } from './routes/auth.register'
import { BrowsePage } from './routes/browse'
import { HomePage } from './routes/index'
import { ReviewPage } from './routes/review'
import { StatsPage } from './routes/stats'
import { CollectionsListPage, CollectionDetailPage } from './routes/collections'

function RootLayout() {
  const { user, isOnline } = useAuth()
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    seedVerses('ara')
  }, [])

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1 className="top-bar-title">Remember Bible</h1>
        <div className="top-bar-right">
          <ThemeToggle />
          {!isOnline && <span className="offline-badge">Offline</span>}
          {user && <span className="user-badge">{user.email}</span>}
        </div>
      </header>

      <div className="app-body">
        {isDesktop && (
          <nav className="sidebar-nav">
            <div className="sidebar-rule" />
            <Link to="/" className="nav-item" activeProps={{ className: 'nav-item active' }}>
              Início
            </Link>
            <Link to="/browse" className="nav-item" activeProps={{ className: 'nav-item active' }}>
              Bíblia
            </Link>
            <Link to="/review" className="nav-item" activeProps={{ className: 'nav-item active' }}>
              Revisar
            </Link>
            <Link to="/collections" className="nav-item" activeProps={{ className: 'nav-item active' }}>
              Coleções
            </Link>
            <Link to="/stats" className="nav-item" activeProps={{ className: 'nav-item active' }}>
              Progresso
            </Link>
            <div className="sidebar-rule" />
          </nav>
        )}

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {!isDesktop && (
        <nav className="bottom-nav">
          <Link to="/" className="nav-item" activeProps={{ className: 'nav-item active' }}>
            Início
          </Link>
          <Link to="/browse" className="nav-item" activeProps={{ className: 'nav-item active' }}>
            Bíblia
          </Link>
          <Link to="/review" className="nav-item" activeProps={{ className: 'nav-item active' }}>
            Revisar
          </Link>
          <Link to="/collections" className="nav-item" activeProps={{ className: 'nav-item active' }}>
            Coleções
          </Link>
          <Link to="/stats" className="nav-item" activeProps={{ className: 'nav-item active' }}>
            Stats
          </Link>
        </nav>
      )}
    </div>
  )
}

const rootRoute = createRootRoute({ component: RootLayout })

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const browseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/browse',
  component: BrowsePage,
})

const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/review',
  component: ReviewPage,
})

const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stats',
  component: StatsPage,
})

const collectionsListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collections',
  component: CollectionsListPage,
})

const collectionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collections/$id',
  component: CollectionDetailPage,
})

const authLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const authRegisterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
})

const routeTree = rootRoute.addChildren([homeRoute, browseRoute, reviewRoute, collectionsListRoute, collectionDetailRoute, statsRoute, authLoginRoute, authRegisterRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
