import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './auth'
import { syncRoutes } from './sync'
import { versesRoutes } from './verses'

const app = new Hono()

const ALLOWED_ORIGINS = ['https://verbum-vitae.pages.dev', 'https://verbum-vitae.workers.dev']

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return origin
      return ALLOWED_ORIGINS[0]
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
)

app.use('/api/*', async (c, next) => {
  await next()
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  if (!c.res.headers.has('Cache-Control')) {
    c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  }
})

app.route('/api/auth', authRoutes)
app.route('/api/sync', syncRoutes)
app.route('/api/verses', versesRoutes)

app.get('/api/health', (c) => c.json({ ok: true, time: new Date().toISOString() }))

export default app
