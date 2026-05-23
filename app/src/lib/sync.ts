import { db, type SyncLog } from './db'
import { api } from './worker'

let syncTimer: ReturnType<typeof setInterval> | null = null

export function startAutoSync() {
  if (syncTimer) return
  syncTimer = setInterval(syncNow, 30000)
  syncNow()
}

export function stopAutoSync() {
  if (syncTimer) clearInterval(syncTimer)
  syncTimer = null
}

export async function syncNow() {
  const token = localStorage.getItem('auth_token')
  if (!token) return

  try {
    await pushPending()
    await pullRemote()
  } catch (e) {
    console.warn('Sync failed:', e)
  }
}

async function pushPending() {
  const pending = await db.syncLog.where({ synced: 0 }).toArray()
  if (pending.length === 0) return

  const entries = pending.map((e) => ({
    tableName: e.tableName,
    rowId: e.rowId,
    operation: e.operation,
    data: e.data,
  }))

  await api.sync.push(entries)

  const ids = pending.map((e) => e.id!).filter(Boolean) as number[]
  await db.syncLog.where('id').anyOf(ids).modify({ synced: 1 })
}

async function pullRemote() {
  const lastSynced = await db.syncLog.orderBy('createdAt').last()
  const cursor = lastSynced?.synced === 1 ? undefined : undefined

  const result = await api.sync.pull(cursor)
  if (!result.entries?.length) return

  for (const entry of result.entries) {
    if (entry.tableName !== 'progress') continue

    try {
      const data = JSON.parse(entry.data)
      const exists = await db.progress.where({ verseId: data.verseId, translation: data.translation }).first()

      if (entry.operation === 'delete') {
        if (exists) await db.progress.delete(exists.id!)
      } else {
        if (exists) {
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
      }
    } catch {
      /* skip invalid entries */
    }
  }
}

export async function logProgressChange(entry: Omit<SyncLog, 'id' | 'synced' | 'createdAt'>) {
  await db.syncLog.put({
    ...entry,
    synced: 0,
    createdAt: Date.now(),
  })
}
