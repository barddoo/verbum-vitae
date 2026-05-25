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
    await pullRemote()
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

  const pending = await db.syncLog.where({ synced: 0, userId }).limit(100).toArray()
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
          let card: { due: Date | string; state: number }
          try {
            card = parseCardJson(data.cardJson)
          } catch {
            card = { due: new Date(), state: 0 }
          }
          const verseId = data.verseId
          const translation = data.translation
          const exists = await db.progress.where({ verseId, translation }).first()

          if (entry.operation === 'delete') {
            if (exists) await db.progress.delete(exists.id!)
            return
          }

          const fields = {
            cardJson: data.cardJson,
            state: typeof data.state === 'number' ? data.state : ((card.state as number) ?? 0),
            dueDate: typeof data.dueDate === 'number' ? data.dueDate : new Date(card.due).getTime(),
            streak: typeof data.streak === 'number' ? data.streak : 0,
            updatedAt: Date.now(),
          }

          if (exists) {
            await db.progress.update(exists.id!, fields)
          } else {
            await db.progress.put({ verseId, translation, ...fields })
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

export async function logProgressChange(entry: Omit<SyncLog, 'id' | 'userId' | 'synced' | 'createdAt'>) {
  const userId = getUserId()
  await db.syncLog.put({
    ...entry,
    userId,
    synced: 0,
    createdAt: Date.now(),
  })
}
