import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { verify } from 'hono/jwt'
import { z } from 'zod'
import * as schema from '../db/schema'
import { progress, syncLog } from '../db/schema'

const syncApp = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>()

function getDb(c: any) {
  return drizzle(c.env.DB, { schema })
}

const JWT_SECRET = 'remember-bible-jwt-secret-change-in-production'

async function getUser(c: any) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const payload = await verify(auth.slice(7), JWT_SECRET, 'HS256')
    return payload as { sub: string; email: string }
  } catch {
    return null
  }
}

const pushSchema = z.object({
  entries: z.array(
    z.object({
      tableName: z.string(),
      rowId: z.string(),
      operation: z.enum(['create', 'update', 'delete']),
      data: z.string(),
    }),
  ),
})

syncApp.post('/push', zValidator('json', pushSchema), async (c) => {
  const user = await getUser(c)
  if (!user) return c.json({ error: 'Não autenticado' }, 401)

  const { entries } = c.req.valid('json')
  const db = getDb(c)
  const now = new Date().toISOString()

  for (const entry of entries) {
    const id = crypto.randomUUID()

    await db.insert(syncLog).values({
      id,
      userId: user.sub,
      tableName: entry.tableName,
      rowId: entry.rowId,
      operation: entry.operation,
      data: entry.data,
      createdAt: now,
    })

    if (entry.tableName === 'progress') {
      const parsed = JSON.parse(entry.data)
      if (entry.operation === 'create') {
        await db
          .insert(progress)
          .values({
            id: entry.rowId,
            userId: user.sub,
            verseId: parsed.verseId,
            translation: parsed.translation,
            cardJson: parsed.cardJson,
            ease: 2.5,
            intervalDays: 0,
            repetitions: 0,
            nextReview: parsed.nextReview || now,
            lastReview: parsed.lastReview || now,
            createdAt: now,
            updatedAt: now,
          })
          .run()
          .catch(() => {})
      } else if (entry.operation === 'update') {
        await db
          .update(progress)
          .set({
            cardJson: parsed.cardJson || undefined,
            lastReview: parsed.lastReview || now,
            updatedAt: now,
          })
          .where(eq(progress.id, entry.rowId))
          .run()
          .catch(() => {})
      } else if (entry.operation === 'delete') {
        await db
          .delete(progress)
          .where(eq(progress.id, entry.rowId))
          .run()
          .catch(() => {})
      }
    }
  }

  return c.json({ pushed: entries.length })
})

syncApp.get('/pull', async (c) => {
  const user = await getUser(c)
  if (!user) return c.json({ error: 'Não autenticado' }, 401)

  const cursor = c.req.query('cursor')
  const db = getDb(c)

  const query = db.select().from(syncLog).where(eq(syncLog.userId, user.sub)).orderBy(syncLog.createdAt)

  if (cursor) {
    // Not ideal without index but works for MVP
    const logs = await query.all()
    const cursorIdx = logs.findIndex((l) => l.id === cursor)
    const entries = cursorIdx >= 0 ? logs.slice(cursorIdx + 1) : logs
    return c.json({ entries, nextCursor: entries.length > 0 ? entries[entries.length - 1].id : null })
  }

  const entries = await query.all()
  return c.json({ entries, nextCursor: entries.length > 0 ? entries[entries.length - 1].id : null })
})

export { syncApp as syncRoutes }
