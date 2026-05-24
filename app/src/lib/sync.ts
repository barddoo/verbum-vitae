import { db, type SyncLog } from './db'
import { cachedGet } from './storage'
import { api } from './worker'

let syncTimer: ReturnType<typeof setInterval> | null = null
let isSyncing = false
let retryCount = 0
const MAX_RETRY_DELAY = 120_000

export function startAutoSync() {
  if (syncTimer) return
  scheduleNext()
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('online', onOnline)
  syncNow()
}

export function stopAutoSync() {
  if (syncTimer) clearInterval(syncTimer)
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
  if (syncTimer) clearInterval(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    syncNow()
  }, delay)
}

export async function syncNow() {
  const token = cachedGet('auth_token')
  if (!token || !navigator.onLine || isSyncing) return

  isSyncing = true
  try {
    const pendingCount = await db.syncLog.where({ synced: 0 }).count()
    if (pendingCount > 0) await pushPending()
    await pullRemote()
    retryCount = 0
    scheduleNext(30_000)
  } catch (e) {
    console.warn('Sync failed:', e)
    retryCount++
    const delay = Math.min(1000 * 2 ** retryCount, MAX_RETRY_DELAY)
    scheduleNext(delay)
  } finally {
    isSyncing = false
  }
}

async function pushPending() {
  const pending = await db.syncLog.where({ synced: 0 }).limit(100).toArray()
  if (pending.length === 0) return

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

async function pullRemote() {
  let cursor: string | undefined
  let _totalEntries = 0

  for (let i = 0; i < 10; i++) {
    const result = await api.sync.pull(cursor)
    if (!result.entries?.length) break

    _totalEntries += result.entries.length

    await Promise.all(
      result.entries.map(async (entry: { tableName: string; operation: string; data: string }) => {
        if (entry.tableName !== 'progress') return

        try {
          const data = JSON.parse(entry.data)
          const exists = await db.progress.where({ verseId: data.verseId, translation: data.translation }).first()

          if (entry.operation === 'delete') {
            if (exists) await db.progress.delete(exists.id!)
          } else if (exists) {
            await db.progress.update(exists.id!, {
              cardJson: data.cardJson,
              updatedAt: Date.now(),
            })
          } else {
            await db.progress.put({
              verseId: data.verseId,
              translation: data.translation,
              cardJson: data.cardJson,
              state: 0,
              dueDate: Date.now(),
              streak: 0,
              updatedAt: Date.now(),
            })
          }
        } catch {
          /* skip */
        }
      }),
    )

    if (!result.hasMore) break
    cursor = result.nextCursor
  }
}

export async function logProgressChange(entry: Omit<SyncLog, 'id' | 'synced' | 'createdAt'>) {
  await db.syncLog.put({
    ...entry,
    synced: 0,
    createdAt: Date.now(),
  })
}
