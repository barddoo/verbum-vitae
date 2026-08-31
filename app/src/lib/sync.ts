import { db, type SyncLog } from './db'
import { parseCardJson } from './srs'
import { cachedGet } from './storage'
import { api } from './worker'

function getUserId(): string {
  const token = cachedGet('auth_token')
  if (!token) return ''
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('not a JWT')
    const payload = JSON.parse(atob(parts[1]))
    return (payload as { sub?: string }).sub ?? ''
  } catch (e) {
    console.warn('getUserId: failed to parse auth_token', e)
    return ''
  }
}

function syncCursorKey(): string {
  const uid = getUserId()
  return uid ? `sync_cursor:${uid}` : ''
}

function loadCursor(): string | undefined {
  const key = syncCursorKey()
  if (!key) return undefined
  try {
    const val = localStorage.getItem(key)
    return val || undefined
  } catch {
    return undefined
  }
}

function saveCursor(cursor: string | undefined) {
  const key = syncCursorKey()
  if (!key) return
  try {
    if (cursor) {
      localStorage.setItem(key, cursor)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    /* noop */
  }
}

export function clearCursor() {
  const key = syncCursorKey()
  if (key) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* noop */
    }
  }
}

let syncTimer: ReturnType<typeof setInterval> | null = null
let isSyncing = false
let retryCount = 0
const MAX_RETRY_DELAY = 120_000

export type SyncStateCallback = (s: {
  isSyncing?: boolean
  lastSynced?: number | null
  error?: string | null
  pendingCount?: number
}) => void

let syncStateCallback: SyncStateCallback | null = null

export function setSyncStateCallback(cb: SyncStateCallback) {
  syncStateCallback = cb
}

export function clearSyncStateCallback() {
  syncStateCallback = null
}

export function startAutoSync() {
  if (syncTimer) return
  scheduleNext()
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('online', onOnline)
  syncNow()
}

export function stopAutoSync() {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = null
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('online', onOnline)
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') syncNow()
}

function onOnline() {
  syncNow()
}

function scheduleNext(delay = 30_000) {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    syncNow()
  }, delay)
}

export async function syncNow(cb?: SyncStateCallback) {
  const token = cachedGet('auth_token')
  if (!token || !navigator.onLine || isSyncing) return

  isSyncing = true
  const update = cb || syncStateCallback
  update?.({ isSyncing: true, error: null })

  try {
    const pendingCount = await db.syncLog.where({ synced: 0 }).count()
    if (pendingCount > 0) await pushPending()
    await Promise.all([pullRemote(), pullCollections()])
    const remaining = await db.syncLog.where({ synced: 0 }).count()
    retryCount = 0
    update?.({ isSyncing: false, lastSynced: Date.now(), pendingCount: remaining })
    scheduleNext(30_000)
  } catch (e) {
    console.warn('Sync failed:', e)
    retryCount++
    const delay = Math.min(1000 * 2 ** retryCount, MAX_RETRY_DELAY)
    update?.({ isSyncing: false, error: (e as Error)?.message || String(e) })
    scheduleNext(delay)
  } finally {
    isSyncing = false
  }
}

async function pushPending() {
  const userId = getUserId()
  if (!userId) {
    syncStateCallback?.({ error: 'Não foi possível identificar o utilizador. Tente fazer login novamente.' })
    return
  }

  const MAX_BATCHES = 5
  for (let i = 0; i < MAX_BATCHES; i++) {
    const pending = await db.syncLog.where({ synced: 0, userId }).limit(100).toArray()
    if (pending.length === 0) break

    const entries = pending.map((e) => ({
      tableName: e.tableName,
      rowId: e.rowId,
      operation: e.operation,
      data: e.data,
    }))

    await api.sync.push(entries)

    const ids = pending.flatMap((e) => (e.id ? [e.id] : []))
    await db.syncLog.where('id').anyOf(ids).modify({ synced: 1 })
  }
}

async function pullRemote() {
  let cursor = loadCursor()

  for (let i = 0; i < 10; i++) {
    const result = await api.sync.pull(cursor)
    if (!result.rows?.length) {
      break
    }

    for (const row of result.rows) {
      try {
        const card = parseCardJson(row.cardJson)
        let verseId = row.verseId as string
        const translation = row.translation as string
        if (verseId.includes('_')) {
          verseId = `b:${verseId.replace(/_/g, ':')}`
        }

        const hasUnsynced = await db.syncLog
          .where({ synced: 0 })
          .filter((log) => log.tableName === 'progress' && log.rowId === verseId)
          .count()

        if (hasUnsynced > 0) continue

        const fields = {
          cardJson: row.cardJson as string,
          state: card.state ?? 0,
          dueDate: card.due.getTime(),
          streak: typeof card.reps === 'number' ? card.reps : 0,
          updatedAt: new Date(row.updatedAt as string).getTime(),
        }

        // Wrap check+write atomically: prevents a race where a concurrent write
        // inserts the record between our read and our put. A plain auto-increment
        // put that fails with a unique-constraint violation causes Dexie 4.x to push
        // null into optimisticOps, which crashes applyOptimisticOps in useLiveQuery.
        // An explicit transaction also bypasses the cache middleware, so even a
        // failure inside it never touches optimisticOps.
        await db.transaction('rw', db.progress, async () => {
          const existing = await db.progress.where({ verseId, translation }).first()
          if (existing) {
            await db.progress.update(existing.id!, fields)
          } else {
            await db.progress.put({ verseId, translation, ...fields })
          }
        })
      } catch (err) {
        console.warn('pull: skipping row', err)
      }
    }

    if (result.nextCursor) {
      cursor = result.nextCursor as string
      saveCursor(cursor)
    }

    if (!result.hasMore) break
  }
}

async function pullCollections() {
  const result = await api.sync.pullCollections()
  if (!result.collections?.length) return

  for (const serverCol of result.collections) {
    const slug = serverCol.slug as string
    if (!slug) continue

    const hasUnsynced = await db.syncLog
      .where({ synced: 0 })
      .filter((log) => log.tableName === 'collection' && log.rowId === slug)
      .count()

    if (hasUnsynced > 0) continue

    const localCol = await db.collections.where({ slug }).first()
    const now = Date.now()
    const createdAt = serverCol.createdAt ? new Date(serverCol.createdAt as string).getTime() : now

    // Check+insert atomically: the collections page seeds bundled collections in an explicit
    // transaction, so a concurrent sync pull putting the same slug would otherwise trip the
    // unique `slug` index. A single explicit transaction serializes the two.
    const collectionId = await db.transaction('rw', db.collections, async () => {
      const existing = await db.collections.where({ slug }).first()
      if (existing) {
        await db.collections.update(existing.id!, {
          name: serverCol.name as string,
          description: serverCol.description as string,
          icon: serverCol.icon as string,
          color: (serverCol.color as string) || undefined,
          isBuiltin: (serverCol.isBuiltin as number) ?? 0,
          createdAt,
        })
        return existing.id!
      }
      return (
        (await db.collections.put({
          slug,
          name: serverCol.name as string,
          description: (serverCol.description as string) || '',
          icon: (serverCol.icon as string) || '📖',
          color: (serverCol.color as string) || undefined,
          isBuiltin: (serverCol.isBuiltin as number) ?? 0,
          createdAt,
        })) ?? null
      )
    })
    if (collectionId == null) continue

    const serverVerses = serverCol.verses as { verseId: string; translation: string; sortOrder: number }[] | undefined
    if (!serverVerses?.length) {
      await db.collectionVerses.where({ collectionId }).delete()
      continue
    }

    await db.transaction('rw', db.collectionVerses, async () => {
      await db.collectionVerses.where({ collectionId }).delete()

      const entries = serverVerses.map((v, i) => ({
        collectionId,
        verseId: v.verseId,
        translation: v.translation,
        sortOrder: v.sortOrder ?? i,
      }))

      if (entries.length > 0) {
        await db.collectionVerses.bulkPut(entries)
      }
    })
  }
}

export async function logProgressChange(entry: Omit<SyncLog, 'id' | 'userId' | 'synced' | 'createdAt'>) {
  const userId = getUserId()
  await db.syncLog.put({
    ...entry,
    userId,
    synced: 0,
    createdAt: Date.now(),
  })
}
