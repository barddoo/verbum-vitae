import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { uuidv7 } from 'shared/uuid'
import { z } from 'zod'

const PBKDF2_ITERATIONS = 100_000
const PBKDF2_KEY_LENGTH = 32

const authApp = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>()

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
})

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    PBKDF2_KEY_LENGTH * 8,
  )
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const hashHex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${saltHex}:${hashHex}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    PBKDF2_KEY_LENGTH * 8,
  )
  const storedBytes = new Uint8Array(hashHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
  const hashBytes = new Uint8Array(hash)
  if (hashBytes.byteLength !== storedBytes.byteLength) return false
  for (let i = 0; i < hashBytes.byteLength; i++) {
    if (hashBytes[i] !== storedBytes[i]) return false
  }
  return true
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
  const secret = c.env.JWT_SECRET
  if (!secret) return c.json({ error: 'Serviço não configurado' }, 500)

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return c.json({ error: 'Email já registrado' }, 409)

  const id = uuidv7()
  const passwordHash = await hashPassword(password)
  const now = new Date().toISOString()

  await c.env.DB.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, email, passwordHash, now)
    .run()

  const token = await generateToken(id, email, secret)
  return c.json({ token, user: { id, email } })
})

authApp.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const secret = c.env.JWT_SECRET
  if (!secret) return c.json({ error: 'Serviço não configurado' }, 500)

  const user = (await c.env.DB.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').bind(email).first()) as
    | { id: string; email: string; password_hash: string }
    | undefined
  if (!user) return c.json({ error: 'Credenciais inválidas' }, 401)

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return c.json({ error: 'Credenciais inválidas' }, 401)

  const token = await generateToken(user.id, user.email, secret)
  return c.json({ token, user: { id: user.id, email: user.email } })
})

export { authApp as authRoutes }
