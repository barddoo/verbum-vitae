import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { verify } from 'hono/jwt'
import { uuidv7 } from 'shared/uuid'
import { z } from 'zod'

const PULL_LIMIT = 200

const syncApp = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>()

async function getUser(c: any) {
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

function extractCardFields(cardJson: unknown): { ease: number; intervalDays: number; repetitions: number } {
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
  const stmts: D1PreparedStatement[] = []

  for (const entry of entries) {
    const id = uuidv7()
    stmts.push(
      c.env.DB.prepare(
        'INSERT INTO sync_log (id, user_id, table_name, row_id, operation, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).bind(id, user.sub, entry.tableName, entry.rowId, entry.operation, entry.data, now),
    )

    if (entry.tableName === 'progress') {
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(entry.data)
      } catch {
        return c.json({ error: 'Invalid entry data' }, 400)
      }
      if (entry.operation === 'create') {
        const { ease, intervalDays, repetitions } = extractCardFields(parsed.cardJson)
        stmts.push(
          c.env.DB.prepare(
            'INSERT OR IGNORE INTO progress (id, user_id, verse_id, translation, card_json, ease, interval_days, repetitions, next_review, last_review, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          ).bind(
            entry.rowId,
            user.sub,
            parsed.verseId,
            parsed.translation,
            parsed.cardJson,
            ease,
            intervalDays,
            repetitions,
            parsed.nextReview || now,
            parsed.lastReview || now,
            now,
            now,
          ),
        )
      } else if (entry.operation === 'update') {
        const { ease, intervalDays, repetitions } = extractCardFields(parsed.cardJson)
        stmts.push(
          c.env.DB.prepare(
            'UPDATE progress SET card_json = ?, ease = ?, interval_days = ?, repetitions = ?, next_review = ?, last_review = ?, updated_at = ? WHERE id = ?',
          ).bind(
            parsed.cardJson || '',
            ease,
            intervalDays,
            repetitions,
            parsed.nextReview || now,
            parsed.lastReview || now,
            now,
            entry.rowId,
          ),
        )
      } else if (entry.operation === 'delete') {
        stmts.push(c.env.DB.prepare('DELETE FROM progress WHERE id = ?').bind(entry.rowId))
      }
    }
  }

  const CHUNK = 50
  for (let i = 0; i < stmts.length; i += CHUNK) {
    await c.env.DB.batch(stmts.slice(i, i + CHUNK))
  }
  return c.json({ pushed: entries.length })
})

syncApp.get('/pull', async (c) => {
  const user = await getUser(c)
  if (!user) return c.json({ error: 'Não autenticado' }, 401)

  const cursor = c.req.query('cursor')
  const db = c.env.DB

  let result: D1Result<Record<string, unknown>>
  if (cursor) {
    const [createdAt, lastId] = cursor.split('|')
    if (!createdAt || !lastId) {
      return c.json({ error: 'Invalid cursor format' }, 400)
    }
    result = await db
      .prepare(
        'SELECT * FROM sync_log WHERE user_id = ? AND (created_at > ? OR (created_at = ? AND id > ?)) ORDER BY created_at, id LIMIT ?',
      )
      .bind(user.sub, createdAt, createdAt, lastId, PULL_LIMIT)
      .all()
  } else {
    result = await db.prepare('SELECT * FROM sync_log WHERE user_id = ? ORDER BY created_at, id LIMIT ?').bind(user.sub, PULL_LIMIT).all()
  }

  const entries = result.results as any[]
  const last = entries.length > 0 ? entries[entries.length - 1] : null
  return c.json({
    entries,
    nextCursor: last ? `${last.created_at}|${last.id}` : null,
    hasMore: entries.length === PULL_LIMIT,
  })
})

export { syncApp as syncRoutes }
