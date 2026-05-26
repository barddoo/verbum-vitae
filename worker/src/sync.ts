import { zValidator } from '@hono/zod-validator'
import { and, eq, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import { drizzle } from 'drizzle-orm/d1'
import { type Context, Hono } from 'hono'
import { verify } from 'hono/jwt'
import { uuidv7 } from 'shared/uuid'
import { z } from 'zod'
import * as schema from '../db/schema'

const PULL_LIMIT = 200

type SyncEnv = {
  Bindings: { DB: D1Database; JWT_SECRET: string }
}

const syncApp = new Hono<SyncEnv>()

async function getUser(c: Context<SyncEnv>) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const secret = c.env.JWT_SECRET
  if (!secret) return null
  try {
    const payload = await verify(auth.slice(7), secret, 'HS256')
    return payload as { sub: string; email: string }
  } catch {
    return null
  }
}

function extractCardFields(cardJson: unknown): {
  ease: number
  intervalDays: number
  repetitions: number
} {
  let ease = 2.5
  let intervalDays = 0
  let repetitions = 0
  try {
    const card = JSON.parse(cardJson as string)
    if (typeof card.difficulty === 'number') ease = card.difficulty
    if (typeof card.scheduled_days === 'number') intervalDays = card.scheduled_days
    if (typeof card.reps === 'number') repetitions = card.reps
  } catch {
    /* use defaults */
  }
  return { ease, intervalDays, repetitions }
}

const pushSchema = z.object({
  entries: z
    .array(
      z.object({
        tableName: z.string(),
        rowId: z.string(),
        operation: z.enum(['create', 'update', 'delete']),
        data: z.string(),
      }),
    )
    .max(500),
})

syncApp.post('/push', zValidator('json', pushSchema), async (c) => {
  const user = await getUser(c)
  if (!user) return c.json({ error: 'Não autenticado' }, 401)

  const { entries } = c.req.valid('json')
  const now = new Date().toISOString()
  const db = drizzle(c.env.DB, { schema })

  const queries: BatchItem<'sqlite'>[] = []

  for (const entry of entries) {
    queries.push(
      db.insert(schema.syncLog).values({
        id: uuidv7(),
        userId: user.sub,
        tableName: entry.tableName,
        rowId: entry.rowId,
        operation: entry.operation,
        data: entry.data,
        createdAt: now,
      }),
    )

    if (entry.tableName === 'progress') {
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(entry.data)
      } catch {
        return c.json({ error: 'Invalid entry data' }, 400)
      }

      const verseId = parsed.verseId as string
      const translation = parsed.translation as string
      const cardJson = (parsed.cardJson as string) || ''
      const { ease, intervalDays, repetitions } = extractCardFields(parsed.cardJson)
      const nextReview = (parsed.nextReview as string) || now
      const lastReview = (parsed.lastReview as string) || now
      const progressId = uuidv7()

      if (entry.operation === 'delete') {
        queries.push(
          db
            .delete(schema.progress)
            .where(
              and(eq(schema.progress.userId, user.sub), eq(schema.progress.verseId, verseId), eq(schema.progress.translation, translation)),
            ),
        )
      } else {
        queries.push(
          db
            .insert(schema.progress)
            .values({
              id: progressId,
              userId: user.sub,
              verseId,
              translation,
              cardJson,
              ease,
              intervalDays,
              repetitions,
              nextReview,
              lastReview,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [schema.progress.userId, schema.progress.verseId, schema.progress.translation],
              set: {
                cardJson,
                ease,
                intervalDays,
                repetitions,
                nextReview,
                lastReview,
                updatedAt: now,
              },
            }),
        )
      }
    }
  }

  const CHUNK = 50
  for (let i = 0; i < queries.length; i += CHUNK) {
    const chunk = queries.slice(i, i + CHUNK)
    await db.batch(chunk as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
  }

  return c.json({ pushed: entries.length })
})

syncApp.get('/pull', async (c) => {
  const user = await getUser(c)
  if (!user) return c.json({ error: 'Não autenticado' }, 401)

  const cursor = c.req.query('cursor')
  const db = drizzle(c.env.DB, { schema })

  const conditions: ReturnType<typeof sql>[] = [eq(schema.progress.userId, user.sub)]

  if (cursor) {
    const [updatedAt, lastId] = cursor.split('|')
    if (!updatedAt || !lastId) {
      return c.json({ error: 'Invalid cursor format' }, 400)
    }
    conditions.push(
      sql`(${schema.progress.updatedAt} > ${updatedAt} OR (${schema.progress.updatedAt} = ${updatedAt} AND ${schema.progress.id} > ${lastId}))`,
    )
  }

  const rows = await db
    .select({
      id: schema.progress.id,
      verseId: schema.progress.verseId,
      translation: schema.progress.translation,
      cardJson: schema.progress.cardJson,
      updatedAt: schema.progress.updatedAt,
    })
    .from(schema.progress)
    .where(and(...conditions))
    .orderBy(schema.progress.updatedAt, schema.progress.id)
    .limit(PULL_LIMIT)

  const last = rows.length > 0 ? rows[rows.length - 1] : null
  const nextCursor = last ? `${last.updatedAt}|${last.id}` : null

  return c.json({
    rows,
    nextCursor,
    hasMore: rows.length === PULL_LIMIT,
  })
})

export { syncApp as syncRoutes }
