import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './auth'
import { leaderboardRoutes } from './leaderboard'
import { PresenceDO } from './presence-do'
import { syncRoutes } from './sync'
import { versesRoutes } from './verses'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  AUTH_RATE_LIMITER: RateLimit
  SYNC_RATE_LIMITER: RateLimit
  VERSES_RATE_LIMITER: RateLimit
  LEADERBOARD_RATE_LIMITER: RateLimit
  CF_VERSION_METADATA: WorkerVersionMetadata
  ASSETS: { fetch: (req: Request) => Promise<Response> }
  PRESENCE: DurableObjectNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

const ALLOWED_ORIGINS = ['https://verbum-vitae.pages.dev', 'https://verbum-vitae.workers.dev', 'https://vvitae.com']

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return origin
      return null
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
)

function jwtSub(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub ?? null
  } catch {
    return null
  }
}

async function securityHeaders(c: any, next: any) {
  await next()
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  const { id: vId, tag: vTag } = c.env.CF_VERSION_METADATA
  c.res.headers.set('X-Worker-Version', vTag || vId)
  if (!c.res.headers.has('Cache-Control')) {
    c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  }
}

app.use('/api/auth/*', securityHeaders)
app.use('/api/auth/*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const { success } = await c.env.AUTH_RATE_LIMITER.limit({ key: `auth:${ip}:${c.req.path}` })
  if (!success) return c.json({ error: 'Too many requests' }, 429)
  await next()
})

app.use('/api/sync/*', securityHeaders)
app.use('/api/sync/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (auth?.startsWith('Bearer ')) {
    const sub = jwtSub(auth.slice(7))
    if (sub) {
      const { success } = await c.env.SYNC_RATE_LIMITER.limit({ key: `sync:${sub}:${c.req.path}` })
      if (!success) return c.json({ error: 'Too many requests' }, 429)
    }
  }
  await next()
})

app.use('/api/verses/*', securityHeaders)
app.use('/api/verses/*', async (c, next) => {
  let user = 'anonymous'
  const auth = c.req.header('Authorization')
  if (auth?.startsWith('Bearer ')) {
    user = jwtSub(auth.slice(7)) || 'anonymous'
  }
  const { success } = await c.env.VERSES_RATE_LIMITER.limit({ key: `verses:${user}:${c.req.path}` })
  if (!success) return c.json({ error: 'Too many requests' }, 429)
  await next()
})

app.use('/api/leaderboard/*', securityHeaders)
app.use('/api/leaderboard/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  const key = (auth?.startsWith('Bearer ') ? jwtSub(auth.slice(7)) : null) ?? c.req.header('CF-Connecting-IP') ?? 'anon'
  const { success } = await c.env.LEADERBOARD_RATE_LIMITER.limit({ key: `leaderboard:${key}` })
  if (!success) return c.json({ error: 'Too many requests' }, 429)
  await next()
})

app.route('/api/auth', authRoutes)
app.route('/api/sync', syncRoutes)
app.route('/api/verses', versesRoutes)
app.route('/api/leaderboard', leaderboardRoutes)

app.get('/api/health', (c) => {
  const { id: versionId, tag: versionTag } = c.env.CF_VERSION_METADATA
  return c.json({
    ok: true,
    time: new Date().toISOString(),
    versionId,
    version: versionTag || versionId.slice(0, 7),
  })
})

app.get('/ws/presence', async (c) => {
  const upgrade = c.req.header('Upgrade')
  if (!upgrade || upgrade !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426)
  }
  const stub = c.env.PRESENCE.get(c.env.PRESENCE.idFromName('global'))
  return stub.fetch(c.req.raw)
})

app.get('/api/presence/count', async (c) => {
  const stub = c.env.PRESENCE.get(c.env.PRESENCE.idFromName('global'))
  return stub.fetch(c.req.raw)
})

app.get('*', async (c) => {
  const url = new URL(c.req.url)
  return c.env.ASSETS.fetch(new Request(`${url.origin}/index.html`))
})

export default app

export { PresenceDO }
