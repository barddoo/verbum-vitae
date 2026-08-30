import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, gt, inArray, isNotNull, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import { drizzle } from 'drizzle-orm/d1'
import { type Context, Hono } from 'hono'
import { verify } from 'hono/jwt'
import { computeStreak } from 'shared/streak'
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

export function extractCardFields(cardJson: unknown): {
  ease: number
  intervalDays: number
  repetitions: number
  state: number
} {
  let ease = 2.5
  let intervalDays = 0
  let repetitions = 0
  let state = 0
  try {
    const card = JSON.parse(cardJson as string)
    if (typeof card.difficulty === 'number') ease = card.difficulty
    if (typeof card.scheduled_days === 'number') intervalDays = card.scheduled_days
    if (typeof card.reps === 'number') repetitions = card.reps
    if (typeof card.state === 'number') state = card.state
  } catch {
    /* use defaults */
  }
  return { ease, intervalDays, repetitions, state }
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

  const collectionSlugToId = new Map<string, string>()

  const collectionSlugs = entries
    .filter((e) => e.tableName === 'collectionVerse')
    .map((e) => {
      const parts = e.rowId.split('|')
      return parts[0] || ''
    })
    .filter(Boolean)

  if (collectionSlugs.length > 0) {
    const cols = await db
      .select({ id: schema.collections.id, slug: schema.collections.slug })
      .from(schema.collections)
      .where(and(eq(schema.collections.userId, user.sub), inArray(schema.collections.slug, [...new Set(collectionSlugs)])))

    for (const col of cols) {
      collectionSlugToId.set(col.slug, col.id)
    }
  }

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
      const { ease, intervalDays, repetitions, state } = extractCardFields(parsed.cardJson)
      const nextReview = (parsed.nextReview as string) || now
      // Null on a plain add — only an actual review stamps this, and only reviews feed the streak.
      const lastReview = (parsed.lastReview as string | null) ?? null

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
              id: uuidv7(),
              userId: user.sub,
              verseId,
              translation,
              cardJson,
              ease,
              intervalDays,
              repetitions,
              state,
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
                state,
                nextReview,
                // A re-add of an existing verse must not erase the review history already recorded.
                lastReview: sql`COALESCE(excluded.last_review, ${schema.progress.lastReview})`,
                updatedAt: now,
              },
            }),
        )
      }
    } else if (entry.tableName === 'collection') {
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(entry.data)
      } catch {
        return c.json({ error: 'Invalid collection data' }, 400)
      }

      const slug = (parsed.slug as string) || entry.rowId
      const name = (parsed.name as string) || ''
      const description = (parsed.description as string) || ''
      const icon = (parsed.icon as string) || '📖'
      const color = (parsed.color as string) || null
      const isBuiltin = (parsed.isBuiltin as number) ?? 0

      if (entry.operation === 'delete') {
        queries.push(db.delete(schema.collections).where(and(eq(schema.collections.userId, user.sub), eq(schema.collections.slug, slug))))
      } else {
        queries.push(
          db
            .insert(schema.collections)
            .values({
              id: uuidv7(),
              userId: user.sub,
              slug,
              name,
              description,
              icon,
              color,
              isBuiltin,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [schema.collections.userId, schema.collections.slug],
              set: { name, description, icon, color, isBuiltin, updatedAt: now },
            }),
        )
      }
    } else if (entry.tableName === 'collectionVerse') {
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(entry.data)
      } catch {
        return c.json({ error: 'Invalid collectionVerse data' }, 400)
      }

      const rowIdParts = entry.rowId.split('|')
      const collectionSlug = rowIdParts[0] || (parsed.collectionSlug as string) || ''
      const verseId = rowIdParts[1] || (parsed.verseId as string) || ''
      const translation = rowIdParts[2] || (parsed.translation as string) || ''
      const sortOrder = (parsed.sortOrder as number) ?? 0

      if (!collectionSlug || !verseId || !translation) continue

      const collectionId = collectionSlugToId.get(collectionSlug)
      if (!collectionId) continue

      if (entry.operation === 'delete') {
        queries.push(
          db
            .delete(schema.collectionVerses)
            .where(
              and(
                eq(schema.collectionVerses.collectionId, collectionId),
                eq(schema.collectionVerses.verseId, verseId),
                eq(schema.collectionVerses.translation, translation),
              ),
            ),
        )
      } else {
        queries.push(
          db
            .insert(schema.collectionVerses)
            .values({
              id: uuidv7(),
              collectionId,
              verseId,
              translation,
              sortOrder,
              createdAt: now,
            })
            .onConflictDoUpdate({
              target: [schema.collectionVerses.collectionId, schema.collectionVerses.verseId, schema.collectionVerses.translation],
              set: { sortOrder },
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

  const hasProgressEntry = entries.some((e) => e.tableName === 'progress' && e.operation !== 'delete')
  if (hasProgressEntry) {
    const reviewDays = await db
      .selectDistinct({ day: sql<string>`DATE(${schema.progress.lastReview})` })
      .from(schema.progress)
      // `state > 0` covers rows written before adds stopped stamping last_review: a card
      // that never left New was added, not reviewed, whatever its last_review says.
      .where(and(eq(schema.progress.userId, user.sub), isNotNull(schema.progress.lastReview), gt(schema.progress.state, 0)))
      .orderBy(desc(sql`DATE(${schema.progress.lastReview})`))

    const streak = computeStreak(reviewDays.map((r) => r.day))
    await db.update(schema.users).set({ currentStreak: streak }).where(eq(schema.users.id, user.sub))
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

syncApp.get('/pull/collections', async (c) => {
  const user = await getUser(c)
  if (!user) return c.json({ error: 'Não autenticado' }, 401)

  const db = drizzle(c.env.DB, { schema })

  const cols = await db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.userId, user.sub))
    .orderBy(schema.collections.createdAt)

  if (cols.length === 0) {
    return c.json({ collections: [] })
  }

  const colIds = cols.map((c) => c.id)
  const verses = await db
    .select()
    .from(schema.collectionVerses)
    .where(inArray(schema.collectionVerses.collectionId, colIds))
    .orderBy(schema.collectionVerses.sortOrder)

  const versesByColId = new Map<string, { verseId: string; translation: string; sortOrder: number }[]>()
  for (const v of verses) {
    if (!versesByColId.has(v.collectionId)) versesByColId.set(v.collectionId, [])
    versesByColId.get(v.collectionId)!.push({ verseId: v.verseId, translation: v.translation, sortOrder: v.sortOrder ?? 0 })
  }

  const result = cols.map((col) => ({
    slug: col.slug,
    name: col.name,
    description: col.description,
    icon: col.icon,
    color: col.color,
    isBuiltin: col.isBuiltin,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
    verses: versesByColId.get(col.id) || [],
  }))

  return c.json({ collections: result })
})

export { syncApp as syncRoutes }
