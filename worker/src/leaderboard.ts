import { zValidator } from '@hono/zod-validator'
import { type Context, Hono } from 'hono'
import { verify } from 'hono/jwt'
import { UpdateDisplayNameRequestSchema, UpdateLeaderboardVisibilitySchema } from 'shared/types'

type LeaderboardEnv = {
  Bindings: { DB: D1Database; JWT_SECRET: string }
}

type LeaderboardRow = {
  user_id: string
  display_name: string
  memorized_count: number
  total_repetitions: number
  current_streak: number
}

const leaderboardApp = new Hono<LeaderboardEnv>()

async function getUser(c: Context<LeaderboardEnv>) {
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

leaderboardApp.get('/', async (c) => {
  const user = await getUser(c)
  if (!user) return c.json({ error: 'Não autenticado' }, 401)

  // `state = 2` is FSRS Review: the card graduated out of Learning, so it is genuinely
  // memorized rather than merely seen once. Relearning (3) has lapsed and does not count.
  const top50Query = `
    SELECT
      p.user_id,
      COALESCE(u.display_name, 'Usuário ' || SUBSTR(u.id, 1, 6)) AS display_name,
      COUNT(CASE WHEN p.state = 2 THEN 1 END) AS memorized_count,
      SUM(p.repetitions) AS total_repetitions,
      u.current_streak
    FROM progress p
    JOIN users u ON u.id = p.user_id
    WHERE u.hide_from_leaderboard = 0
    GROUP BY p.user_id
    HAVING memorized_count >= 1
    ORDER BY memorized_count DESC, total_repetitions DESC
    LIMIT 50
  `

  const [{ results }, userMeta] = await Promise.all([
    c.env.DB.prepare(top50Query).all<LeaderboardRow>(),
    c.env.DB.prepare('SELECT hide_from_leaderboard FROM users WHERE id = ?').bind(user.sub).first<{ hide_from_leaderboard: number }>(),
  ])

  const currentUserHidden = (userMeta?.hide_from_leaderboard ?? 0) === 1

  const entries = results.map((row, i) => ({
    rank: i + 1,
    displayName: row.display_name,
    memorizedCount: row.memorized_count,
    totalRepetitions: row.total_repetitions,
    currentStreak: row.current_streak,
    isCurrentUser: row.user_id === user.sub,
  }))

  let currentUserEntry = null

  if (!entries.some((e) => e.isCurrentUser)) {
    const userStatsQuery = `
      SELECT
        COALESCE(u.display_name, 'Usuário ' || SUBSTR(u.id, 1, 6)) AS display_name,
        COUNT(CASE WHEN p.state = 2 THEN 1 END) AS memorized_count,
        SUM(p.repetitions) AS total_repetitions,
        u.current_streak
      FROM progress p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
      GROUP BY p.user_id
      HAVING memorized_count >= 1
    `
    const userRow = await c.env.DB.prepare(userStatsQuery).bind(user.sub).first<LeaderboardRow>()

    if (userRow) {
      // Must mirror the top-50 population, hidden users included — otherwise they
      // silently inflate the rank shown to everyone below them.
      const rankQuery = `
        SELECT COUNT(*) AS users_above
        FROM (
          SELECT p.user_id, COUNT(CASE WHEN p.state = 2 THEN 1 END) AS mc, SUM(p.repetitions) AS tr
          FROM progress p
          JOIN users u ON u.id = p.user_id
          WHERE u.hide_from_leaderboard = 0
          GROUP BY p.user_id
        )
        WHERE mc > ? OR (mc = ? AND tr > ?)
      `
      const rankRow = await c.env.DB.prepare(rankQuery)
        .bind(userRow.memorized_count, userRow.memorized_count, userRow.total_repetitions)
        .first<{ users_above: number }>()

      currentUserEntry = {
        rank: (rankRow?.users_above ?? 0) + 1,
        displayName: userRow.display_name,
        memorizedCount: userRow.memorized_count,
        totalRepetitions: userRow.total_repetitions,
        currentStreak: userRow.current_streak,
        isCurrentUser: true,
      }
    }
  }

  // Per-user payload (isCurrentUser flags, own rank) — never let a shared cache reuse it.
  c.header('Cache-Control', 'private, max-age=60')
  c.header('Vary', 'Authorization')
  return c.json({ entries, currentUserEntry, currentUserHidden })
})

leaderboardApp.patch('/profile', zValidator('json', UpdateDisplayNameRequestSchema), async (c) => {
  const user = await getUser(c)
  if (!user) return c.json({ error: 'Não autenticado' }, 401)
  const { displayName } = c.req.valid('json')
  await c.env.DB.prepare('UPDATE users SET display_name = ? WHERE id = ?').bind(displayName, user.sub).run()
  return c.json({ ok: true, displayName })
})

leaderboardApp.patch('/visibility', zValidator('json', UpdateLeaderboardVisibilitySchema), async (c) => {
  const user = await getUser(c)
  if (!user) return c.json({ error: 'Não autenticado' }, 401)
  const { hideFromLeaderboard } = c.req.valid('json')
  await c.env.DB.prepare('UPDATE users SET hide_from_leaderboard = ? WHERE id = ?')
    .bind(hideFromLeaderboard ? 1 : 0, user.sub)
    .run()
  return c.json({ ok: true, hideFromLeaderboard })
})

export { leaderboardApp as leaderboardRoutes }
