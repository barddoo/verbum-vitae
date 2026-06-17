import { createRootRoute, createRoute, createRouter, Link, Outlet } from '@tanstack/react-router'
import { BarChart2, BookOpen, Home, Layers, RotateCcw } from 'lucide-react'
import { lazy, Suspense, useEffect, useReducer, useState } from 'react'
import { DonateModal } from './components/donate-modal'
import { HelpModal } from './components/help-modal'
import { PresenceBadge } from './components/presence-badge'
import { PwaInstallButton } from './components/pwa-install-button'
import { SyncErrorBanner } from './components/sync-error-banner'
import { SyncIndicator } from './components/sync-indicator'
import { ThemeToggle } from './components/theme-toggle'
import { UpdateBanner } from './components/update-banner'

const AuthModal = lazy(() => import('./components/auth-modal').then((m) => ({ default: m.AuthModal })))
const WelcomeModal = lazy(() => import('./components/welcome-modal').then((m) => ({ default: m.WelcomeModal })))

import { useAuth } from './lib/auth'

const loadingSpinner = <div className="loading">Carregando…</div>

const HomePage = lazy(() => import('./routes/index').then((m) => ({ default: m.HomePage })))
const BrowsePage = lazy(() => import('./routes/browse').then((m) => ({ default: m.BrowsePage })))
const ReviewPage = lazy(() => import('./routes/review').then((m) => ({ default: m.ReviewPage })))
const StatsPage = lazy(() => import('./routes/stats').then((m) => ({ default: m.StatsPage })))
const CollectionsListPage = lazy(() => import('./routes/collections').then((m) => ({ default: m.CollectionsListPage })))
const CollectionDetailPage = lazy(() => import('./routes/collections').then((m) => ({ default: m.CollectionDetailPage })))
const AddVersesToCollectionPage = lazy(() =>
  import('./routes/collections.$slug.add').then((m) => ({ default: m.AddVersesToCollectionPage })),
)

type Modal = 'auth' | 'donate' | 'help' | 'welcome'

function modalReducer(state: Modal[], action: { type: 'open'; modal: Modal } | { type: 'close'; modal: Modal }): Modal[] {
  switch (action.type) {
    case 'open':
      return state.includes(action.modal) ? state : [...state, action.modal]
    case 'close':
      return state.filter((m) => m !== action.modal)
  }
}

function RootLayout() {
  const { user, isOnline, logout } = useAuth()
  const [modals, dispatch] = useReducer(
    modalReducer,
    (['welcome'] as Modal[]).filter(() => !localStorage.getItem('welcomed')),
  )
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches)

  const setShowAuth = (v: boolean) => dispatch({ type: v ? 'open' : 'close', modal: 'auth' })
  const setShowDonate = (v: boolean) => dispatch({ type: v ? 'open' : 'close', modal: 'donate' })
  const setShowHelp = (v: boolean) => dispatch({ type: v ? 'open' : 'close', modal: 'help' })
  const setShowWelcome = (v: boolean) => dispatch({ type: v ? 'open' : 'close', modal: 'welcome' })
  const showAuth = modals.includes('auth')
  const showDonate = modals.includes('donate')
  const showHelp = modals.includes('help')
  const showWelcome = modals.includes('welcome')

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div className="app-shell">
      <SyncErrorBanner />
      <UpdateBanner />
      <header className="top-bar">
        <Link to="/" className="top-bar-logo">
          <img src="/favicon-32x32.png" alt="" width={22} height={22} />
          <h1 className="top-bar-title">Verbum Vitae</h1>
        </Link>
        <div className="top-bar-right">
          <button type="button" className="btn-help" onClick={() => setShowHelp(true)} aria-label="Ajuda">
            ?
          </button>
          <PwaInstallButton />
          <ThemeToggle />
          <PresenceBadge />
          {user && !isOnline && <span className="offline-badge">Offline</span>}
          {user && <SyncIndicator />}
          {user ? (
            <button type="button" className="btn btn-sm btn-secondary" onClick={logout}>
              Sair
            </button>
          ) : (
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowAuth(true)}>
              Entrar
            </button>
          )}
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
          <Suspense fallback={loadingSpinner}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {isDesktop && (
        <footer className="app-footer">
          <div>
            Feito por{' '}
            <a href="https://barddoo.com" target="_blank" rel="noopener noreferrer">
              Charles Fonseca
            </a>{' '}
            &mdash;{' '}
            <a href="https://github.com/barddoo/verbum-vitae" target="_blank" rel="noopener noreferrer">
              código aberto
            </a>
          </div>
          <button type="button" className="app-footer-donate" onClick={() => setShowDonate(true)}>
            ₿ Doar
          </button>
        </footer>
      )}

      {!isDesktop && (
        <nav className="bottom-nav">
          <Link to="/" className="nav-item" activeProps={{ className: 'nav-item active' }}>
            <Home size={20} strokeWidth={1.5} />
            <span>Início</span>
          </Link>
          <Link to="/browse" className="nav-item" activeProps={{ className: 'nav-item active' }}>
            <BookOpen size={20} strokeWidth={1.5} />
            <span>Bíblia</span>
          </Link>
          <Link to="/review" className="nav-item" activeProps={{ className: 'nav-item active' }}>
            <RotateCcw size={20} strokeWidth={1.5} />
            <span>Revisar</span>
          </Link>
          <Link to="/collections" className="nav-item" activeProps={{ className: 'nav-item active' }}>
            <Layers size={20} strokeWidth={1.5} />
            <span>Coleções</span>
          </Link>
          <Link to="/stats" className="nav-item" activeProps={{ className: 'nav-item active' }}>
            <BarChart2 size={20} strokeWidth={1.5} />
            <span>Stats</span>
          </Link>
          <button type="button" className="nav-item nav-donate" onClick={() => setShowDonate(true)}>
            <span className="nav-donate-icon">₿</span>
            <span>Doar</span>
          </button>
        </nav>
      )}

      {showAuth && (
        <Suspense fallback={null}>
          <AuthModal onClose={() => setShowAuth(false)} />
        </Suspense>
      )}
      {showDonate && <DonateModal onClose={() => setShowDonate(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showWelcome && (
        <Suspense fallback={null}>
          <WelcomeModal onClose={() => setShowWelcome(false)} />
        </Suspense>
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
  validateSearch: (search: Record<string, unknown>): { book?: string; chapter?: string } => ({
    book: typeof search.book === 'string' ? search.book : undefined,
    chapter: typeof search.chapter === 'string' ? search.chapter : undefined,
  }),
  component: BrowsePage,
})

const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/review',
  validateSearch: (search: Record<string, unknown>): { autostart?: '1' } => ({
    autostart: search.autostart === '1' ? '1' : undefined,
  }),
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
  path: '/collections/$slug',
  component: CollectionDetailPage,
})

const addVersesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collections/$slug/add',
  component: AddVersesToCollectionPage,
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  browseRoute,
  reviewRoute,
  collectionsListRoute,
  collectionDetailRoute,
  addVersesRoute,
  statsRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
