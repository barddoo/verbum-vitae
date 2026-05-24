import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { z } from 'zod'
import * as schema from '../db/schema'
import { users } from '../db/schema'

const authApp = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>()

function getDb(c: any) {
  return drizzle(c.env.DB, { schema })
}

function getJwtSecret(c: any): string {
  return c.env.JWT_SECRET || 'verbum-vitae-jwt-secret-change-in-production'
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  const hashArr = Array.from(new Uint8Array(hashBuf))
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function generateToken(userId: string, email: string, secret: string): Promise<string> {
  const payload = {
    sub: userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  }
  return await sign(payload, secret)
}

authApp.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const db = getDb(c)
  const secret = getJwtSecret(c)

  const existing = await db.select().from(users).where(eq(users.email, email)).get()
  if (existing) {
    return c.json({ error: 'Email já registrado' }, 409)
  }

  const id = crypto.randomUUID()
  const passwordHash = await hashPassword(password)
  const now = new Date().toISOString()

  await db.insert(users).values({
    id,
    email,
    passwordHash,
    createdAt: now,
  })

  const token = await generateToken(id, email, secret)
  return c.json({ token, user: { id, email } })
})

authApp.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const db = getDb(c)
  const secret = getJwtSecret(c)

  const user = await db.select().from(users).where(eq(users.email, email)).get()
  if (!user) {
    return c.json({ error: 'Credenciais inválidas' }, 401)
  }

  const passwordHash = await hashPassword(password)
  if (passwordHash !== user.passwordHash) {
    return c.json({ error: 'Credenciais inválidas' }, 401)
  }

  const token = await generateToken(user.id, user.email, secret)
  return c.json({ token, user: { id: user.id, email: user.email } })
})

export { authApp as authRoutes }
