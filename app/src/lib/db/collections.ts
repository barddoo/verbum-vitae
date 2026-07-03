import { slugify } from '../slugify'
import { type Collection, db, type Progress, type SyncLog } from './schema'

export async function getCollectionProgress(collectionId: number, _translation: string) {
  const cv = await db.collectionVerses.where({ collectionId }).toArray()
  const total = cv.length
  const memorized = await db.progress
    .where('[verseId+translation]')
    .anyOf(cv.map((c) => [c.verseId, c.translation] as [string, string]))
    .count()
  return { total, memorized, percent: total > 0 ? Math.round((memorized / total) * 100) : 0 }
}

export async function addCollectionToMemory(
  collectionId: number,
  translation: string,
  _progressIdFn: () => string,
  logChange: (entry: Omit<SyncLog, 'id' | 'userId' | 'synced' | 'createdAt'>) => void,
) {
  const [cv, { createEmptyCard }] = await Promise.all([db.collectionVerses.where({ collectionId }).toArray(), import('../srs')])

  const toAdd: Progress[] = []
  await db.transaction('r', db.progress, async () => {
    for (const c of cv) {
      const existing = await db.progress.where({ verseId: c.verseId, translation }).first()
      if (!existing) {
        const card = createEmptyCard()
        toAdd.push({
          verseId: c.verseId,
          translation,
          cardJson: JSON.stringify(card),
          state: 0,
          dueDate: card.due.getTime(),
          streak: 0,
          updatedAt: Date.now(),
        })
      }
    }
  })

  if (toAdd.length === 0) return 0

  await db.transaction('rw', db.progress, async () => {
    await db.progress.bulkAdd(toAdd)
  })

  for (const p of toAdd) {
    const card = JSON.parse(p.cardJson)
    logChange({
      tableName: 'progress',
      rowId: p.verseId,
      operation: 'create',
      data: JSON.stringify({
        verseId: p.verseId,
        translation: p.translation,
        cardJson: p.cardJson,
        state: p.state,
        dueDate: p.dueDate,
        streak: p.streak,
        nextReview: new Date(card.due).toISOString(),
        lastReview: new Date().toISOString(),
      }),
    })
  }

  return toAdd.length
}

function getUserId(): string {
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) return ''
    const parts = token.split('.')
    if (parts.length !== 3) return ''
    const payload = JSON.parse(atob(parts[1]))
    return (payload as { sub?: string }).sub ?? ''
  } catch {
    return ''
  }
}

async function logSyncChange(entry: Omit<SyncLog, 'id' | 'userId' | 'synced' | 'createdAt'>) {
  const userId = getUserId()
  await db.syncLog.put({ ...entry, userId, synced: 0, createdAt: Date.now() })
}

export async function createUserCollection(data: {
  name: string
  description: string
  icon: string
  color: string | null
  verses: { verseId: string; translation: string }[]
}): Promise<number> {
  const slugValue = slugify(data.name) || `collection-${Date.now()}`
  const createdAt = Date.now()

  const collectionId = await db.collections.put({
    slug: slugValue,
    name: data.name,
    description: data.description,
    icon: data.icon,
    color: data.color || undefined,
    isBuiltin: 0,
    createdAt,
  })

  await logSyncChange({
    tableName: 'collection',
    rowId: slugValue,
    operation: 'create',
    data: JSON.stringify({
      slug: slugValue,
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      isBuiltin: 0,
      createdAt: new Date(createdAt).toISOString(),
      updatedAt: new Date(createdAt).toISOString(),
    }),
  })

  if (data.verses.length > 0 && collectionId) {
    await addVersesToCollection(collectionId, data.verses)
  }

  return collectionId!
}

export async function updateUserCollection(collectionId: number, data: { description?: string; icon?: string; color?: string | null }) {
  const col = await db.collections.get(collectionId)
  if (!col) return

  const updates: Partial<Collection> = {}
  if (data.description !== undefined) updates.description = data.description
  if (data.icon !== undefined) updates.icon = data.icon
  if (data.color !== undefined) updates.color = data.color || undefined

  if (Object.keys(updates).length === 0) return

  await db.collections.update(collectionId, updates)

  const updated = { ...col, ...updates }
  await logSyncChange({
    tableName: 'collection',
    rowId: col.slug,
    operation: 'update',
    data: JSON.stringify({
      slug: col.slug,
      name: col.name,
      description: updated.description,
      icon: updated.icon,
      color: updated.color ?? null,
      isBuiltin: col.isBuiltin,
      createdAt: new Date(col.createdAt).toISOString(),
      updatedAt: new Date(Date.now()).toISOString(),
    }),
  })
}

export async function deleteUserCollection(collectionId: number) {
  const col = await db.collections.get(collectionId)
  if (!col) return

  await logSyncChange({
    tableName: 'collection',
    rowId: col.slug,
    operation: 'delete',
    data: JSON.stringify({
      slug: col.slug,
      name: col.name,
    }),
  })

  const verses = await db.collectionVerses.where({ collectionId }).toArray()
  await Promise.all(
    verses.map((v) =>
      logSyncChange({
        tableName: 'collectionVerse',
        rowId: `${col.slug}|${v.verseId}|${v.translation}`,
        operation: 'delete',
        data: JSON.stringify({ collectionSlug: col.slug, verseId: v.verseId, translation: v.translation }),
      }),
    ),
  )

  await db.collectionVerses.where({ collectionId }).delete()
  await db.collections.delete(collectionId)
}

export async function addVersesToCollection(collectionId: number, verses: { verseId: string; translation: string }[]): Promise<number> {
  const col = await db.collections.get(collectionId)
  if (!col) return 0

  const existing = await db.collectionVerses.where({ collectionId }).toArray()
  const existingSet = new Set(existing.map((v) => `${v.verseId}|${v.translation}`))

  const toAdd = verses.filter((v) => !existingSet.has(`${v.verseId}|${v.translation}`))
  if (toAdd.length === 0) return 0

  const maxOrder = existing.reduce((max, v) => Math.max(max, v.sortOrder), 0)
  const entries = toAdd.map((v, i) => ({
    collectionId,
    verseId: v.verseId,
    translation: v.translation,
    sortOrder: maxOrder + i + 1,
  }))

  await db.collectionVerses.bulkPut(entries)

  await Promise.all(
    entries.map((e) =>
      logSyncChange({
        tableName: 'collectionVerse',
        rowId: `${col.slug}|${e.verseId}|${e.translation}`,
        operation: 'create',
        data: JSON.stringify({ collectionSlug: col.slug, verseId: e.verseId, translation: e.translation, sortOrder: e.sortOrder }),
      }),
    ),
  )

  return toAdd.length
}

export async function removeVerseFromCollection(collectionId: number, verseId: string, translation: string) {
  const col = await db.collections.get(collectionId)
  if (!col) return

  await db.collectionVerses.where({ collectionId, verseId, translation }).delete()

  await logSyncChange({
    tableName: 'collectionVerse',
    rowId: `${col.slug}|${verseId}|${translation}`,
    operation: 'delete',
    data: JSON.stringify({ collectionSlug: col.slug, verseId, translation }),
  })
}
