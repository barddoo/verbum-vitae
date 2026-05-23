import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './auth'
import { syncRoutes } from './sync'
import { versesRoutes } from './verses'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
)

app.route('/api/auth', authRoutes)
app.route('/api/sync', syncRoutes)
app.route('/api/verses', versesRoutes)

app.get('/api/health', (c) => c.json({ ok: true, time: new Date().toISOString() }))

export default app
