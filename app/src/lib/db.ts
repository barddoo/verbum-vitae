import Dexie, { type EntityTable } from 'dexie'
import type { VerseRow } from 'shared/types'
import { slugify } from './slugify'

export interface TextItem extends VerseRow {
  id?: number
}

export interface Progress {
  id?: number
  verseId: string
  translation: string
  cardJson: string
  state: number
  dueDate: number
  streak: number
  /** When this verse was last reviewed — mirrors the server's `last_review`. Unset until the first review, and on rows written before it existed. */
  lastReview?: number
  updatedAt: number
}

/**
 * When this verse was last reviewed, or null if it never was.
 *
 * Rows written before `lastReview` existed fall back to `updatedAt`, but only once the card
 * has left the New state — a card still in New was added, not reviewed, whatever its `updatedAt` says.
 */
export function lastReviewedAt(p: Progress): number | null {
  if (p.lastReview !== undefined) return p.lastReview
  return p.state > 0 ? p.updatedAt : null
}

export interface Collection {
  id?: number
  slug: string
  name: string
  description: string
  icon: string
  color?: string
  isBuiltin: number
  createdAt: number
}

export interface CollectionVerse {
  id?: number
  collectionId: number
  verseId: string
  translation: string
  sortOrder: number
}

/**
 * One row per grade press — the history `progress` cannot hold, since it only ever keeps the
 * *latest* review per verse.
 *
 * Two things depend on this being append-only: the review calendar and "hoje" counter in
 * `stats.tsx` (deriving them from `progress.lastReview` makes past days vanish as verses are
 * reviewed again), and any future FSRS parameter optimization, which needs a full review log.
 */
export interface ReviewLog {
  id?: number
  verseId: string
  translation: string
  /** Epoch ms of the grade press. */
  reviewedAt: number
  /**
   * FSRS grade: 1 Again, 2 Hard, 3 Good, 4 Easy.
   *
   * `0` marks a row backfilled from `progress.lastReview` by the v7 upgrade — the day is real
   * but the grade was never recorded. Filter these out before feeding an optimizer.
   */
  rating: number
  /** Card state *before* this review: 0 New, 1 Learning, 2 Review, 3 Relearning. */
  state: number
  /** Interval FSRS scheduled after this review, in days. */
  scheduledDays: number
}

export interface WordStats {
  id?: number
  verseId: string
  translation: string
  wordIndex: number
  word: string
  correctCount: number
  incorrectCount: number
}

export interface SyncLog {
  id?: number
  userId: string
  tableName: string
  rowId: string
  operation: 'create' | 'update' | 'delete'
  data: string
  synced: number
  createdAt: number
}

export const db = new Dexie('RememberBible') as Dexie & {
  verses: EntityTable<TextItem, 'id'>
  progress: EntityTable<Progress, 'id'>
  reviewLog: EntityTable<ReviewLog, 'id'>
  wordStats: EntityTable<WordStats, 'id'>
  collections: EntityTable<Collection, 'id'>
  collectionVerses: EntityTable<CollectionVerse, 'id'>
  syncLog: EntityTable<SyncLog, 'id'>
}

db.version(3).stores({
  verses: '++id, &[bookNumber+chapter+verse+translation], [bookNumber+chapter], bookNumber, translation',
  progress: '++id, &[verseId+translation], dueDate, state, [dueDate+state]',
  wordStats: '++id, &[verseId+translation+wordIndex], [verseId+translation]',
  collections: '++id, &name, isBuiltin',
  collectionVerses: '++id, &[collectionId+verseId+translation], collectionId',
  syncLog: '++id, userId, tableName, rowId, synced, createdAt',
})

db.version(4).stores({
  verses: '++id, &[bookNumber+chapter+verse+translation], [bookNumber+chapter], bookNumber, translation',
  progress: '++id, &[verseId+translation], dueDate, state, [dueDate+state], translation',
  wordStats: '++id, &[verseId+translation+wordIndex], [verseId+translation]',
  collections: '++id, &name, isBuiltin',
  collectionVerses: '++id, &[collectionId+verseId+translation], collectionId',
  syncLog: '++id, userId, tableName, rowId, synced, createdAt',
})

db.version(5).stores({
  verses: '++id, &[bookNumber+chapter+verse+translation], [bookNumber+chapter], bookNumber, translation',
  progress: '++id, &[verseId+translation], dueDate, state, [dueDate+state], translation',
  wordStats: '++id, &[verseId+translation+wordIndex], [verseId+translation]',
  collections: '++id, &slug, &name, isBuiltin',
  collectionVerses: '++id, &[collectionId+verseId+translation], collectionId',
  syncLog: '++id, userId, tableName, rowId, synced, createdAt',
})

db.version(6)
  .stores({
    verses:
      '++id, &[sourceType+sourceId+bookNumber+chapter+verse+translation], [sourceType+sourceId+bookNumber+chapter], sourceType, translation, [sourceType+sourceId+translation], [sourceType+sourceId+bookNumber+translation]',
    progress: '++id, &[verseId+translation], dueDate, state, [dueDate+state], translation',
    wordStats: '++id, &[verseId+translation+wordIndex], [verseId+translation]',
    collections: '++id, &slug, &name, isBuiltin',
    collectionVerses: '++id, &[collectionId+verseId+translation], collectionId',
    syncLog: '++id, userId, tableName, rowId, synced, createdAt',
  })
  .upgrade(async (tx) => {
    const oldKey = (vk: string) => `b:${vk.replace(/_/g, ':')}`

    await tx.table('verses').toCollection().modify({ sourceType: 'b', sourceId: '' })
    await tx
      .table('progress')
      .toCollection()
      .modify((p) => {
        p.verseId = oldKey(p.verseId)
      })
    await tx
      .table('wordStats')
      .toCollection()
      .modify((s) => {
        s.verseId = oldKey(s.verseId)
      })
    await tx
      .table('collectionVerses')
      .toCollection()
      .modify((cv) => {
        cv.verseId = oldKey(cv.verseId)
      })
    await tx
      .table('syncLog')
      .toCollection()
      .modify((log) => {
        log.rowId = oldKey(log.rowId)
      })
  })

db.version(7)
  .stores({
    reviewLog: '++id, reviewedAt, [verseId+translation]',
  })
  .upgrade(async (tx) => {
    // Seed one row per already-reviewed verse so streaks and the calendar survive the upgrade.
    // This is exactly the (lossy) history `progress` holds today — one day per verse, no grade —
    // so nothing regresses; real history only starts accumulating from here.
    const progress = await tx.table('progress').toArray()
    const seeded = progress
      .map((p: Progress) => ({ p, reviewedAt: lastReviewedAt(p) }))
      .filter((r): r is { p: Progress; reviewedAt: number } => r.reviewedAt !== null)
      .map(({ p, reviewedAt }) => ({
        verseId: p.verseId,
        translation: p.translation,
        reviewedAt,
        rating: 0,
        state: p.state,
        scheduledDays: 0,
      }))

    if (seeded.length > 0) await tx.table('reviewLog').bulkAdd(seeded)
  })

export type TextSourceType = 'bible' | 'creed' | 'catechism'

export interface TextKeyParsed {
  sourceType: TextSourceType
  sourceId: string
  sectionIndex: number
  blockIndex: number
  itemIndex: number
  itemEnd?: number
}

const TEXT_TYPE_CHAR: Record<TextSourceType, string> = { bible: 'b', creed: 'c', catechism: 'k' }
const CHAR_TO_TYPE: Record<string, TextSourceType> = { b: 'bible', c: 'creed', k: 'catechism' }

export function textKey(
  sourceType: TextSourceType,
  sourceId: string,
  section: number,
  block: number,
  item: number,
  itemEnd?: number,
): string {
  const ch = TEXT_TYPE_CHAR[sourceType]
  const coords = itemEnd != null ? `${section}:${block}:${item}:${itemEnd}` : `${section}:${block}:${item}`
  return sourceType === 'bible' ? `${ch}:${coords}` : `${ch}:${sourceId}:${coords}`
}

export function parseTextKey(key: string): TextKeyParsed {
  const parts = key.split(':')
  const typeChar = parts[0]
  const sourceType = CHAR_TO_TYPE[typeChar] || 'bible'

  if (sourceType === 'bible') {
    const [section, block, item, itemEnd] = parts.slice(1).map(Number)
    return { sourceType, sourceId: '', sectionIndex: section, blockIndex: block, itemIndex: item, itemEnd }
  }

  const sourceId = parts[1]
  const [section, block, item, itemEnd] = parts.slice(2).map(Number)
  return {
    sourceType,
    sourceId,
    sectionIndex: section,
    blockIndex: block,
    itemIndex: item || 0,
    itemEnd,
  }
}

export function verseKey(bookNumber: number, chapter: number, verse: number, endVerse?: number): string {
  return textKey('bible', '', bookNumber, chapter, verse, endVerse)
}

export const parseVerseKey = parseTextKey

const seedingByKey = new Map<string, Promise<void>>()

export async function ensureTranslationSeeded(translation: string) {
  const key = `b:${translation}`
  if (!seedingByKey.has(key)) {
    seedingByKey.set(key, seedBibleText(translation))
  }
  return seedingByKey.get(key)!
}

export async function ensureNonBibleTextSeeded(sourceType: TextSourceType, sourceId: string) {
  const key = `${sourceType}:${sourceId}`
  if (!seedingByKey.has(key)) {
    seedingByKey.set(key, seedNonBibleText(sourceType, sourceId))
  }
  return seedingByKey.get(key)!
}

export async function fetchVersesBatch(keys: { verseId: string; translation: string }[]): Promise<Map<string, string>> {
  const sourceKeys = [
    ...new Set(
      keys.map((k) => {
        const p = parseTextKey(k.verseId)
        return p.sourceType === 'bible' ? `b:${k.translation}` : `${p.sourceType}:${p.sourceId}`
      }),
    ),
  ]

  await Promise.all(
    sourceKeys.map((sk) => {
      const [st, si] = sk.split(':')
      if (st === 'b') return ensureTranslationSeeded(si)
      return ensureNonBibleTextSeeded(st as TextSourceType, si)
    }),
  )

  const chapterGroups = new Map<string, { keys: { verseId: string; translation: string }[] }>()
  for (const k of keys) {
    const p = parseTextKey(k.verseId)
    const dbSourceType = p.sourceType === 'bible' ? 'b' : p.sourceType
    const ck = `${dbSourceType}:${p.sourceId}:${p.sectionIndex}:${p.blockIndex}`
    if (!chapterGroups.has(ck)) chapterGroups.set(ck, { keys: [] })
    chapterGroups.get(ck)!.keys.push(k)
  }

  const results = await Promise.all(
    [...chapterGroups].map(async ([ck, group]) => {
      const parts = ck.split(':')
      const dbType = parts[0]
      const si = parts[1]
      const sectionIdx = parseInt(parts[2], 10)
      const blockIdx = parseInt(parts[3], 10)
      const rows = await db.verses.where('[sourceType+sourceId+bookNumber+chapter]').equals([dbType, si, sectionIdx, blockIdx]).toArray()

      const entries: [string, string][] = []
      for (const k of group.keys) {
        const p = parseTextKey(k.verseId)
        const endItem = p.itemEnd || p.itemIndex
        const filtered = rows.filter((r) => r.translation === k.translation && r.verse >= p.itemIndex && r.verse <= endItem)
        entries.push([k.verseId, filtered.map((r) => r.text).join(' ')])
      }
      return entries
    }),
  )

  return new Map(results.flat())
}

async function seedBibleText(translation: string) {
  const count = await db.verses.where({ sourceType: 'b', sourceId: '', translation }).count()
  if (count > 0) return

  let jsonData: { books: string[]; verses: { b: number; c: number; v: number; t: string }[] } | null = null

  try {
    const res = await fetch(`/bible-${translation}.json.gz`)
    if (res.ok) {
      try {
        const buf = await res.arrayBuffer()
        const ds = new DecompressionStream('gzip')
        const blob = new Blob([buf])
        const decompressed = await new Response(blob.stream().pipeThrough(ds)).text()
        jsonData = JSON.parse(decompressed)
      } catch (e: unknown) {
        console.error('Gzip decompression failed, using uncompressed fallback', e)
      }
    }
  } catch {
    /* network error */
  }

  if (!jsonData) {
    const fallback = await fetch(`/bible-${translation}.json`)
    if (!fallback.ok) return
    jsonData = (await fallback.json()) as typeof jsonData
  }

  if (!jsonData) return

  const items: TextItem[] = jsonData.verses.map((v) => ({
    sourceType: 'b',
    sourceId: '',
    bookNumber: v.b,
    chapter: v.c,
    verse: v.v,
    text: v.t.replace(/<[^>]+>/g, '').trim(),
    translation,
  }))

  const chunkSize = 500
  for (let i = 0; i < items.length; i += chunkSize) {
    await db.verses.bulkAdd(items.slice(i, i + chunkSize))
  }
}

interface CreedJSON {
  type: 'creed'
  id: string
  name: string
  sections: { name: string; articles: string[] }[]
}

interface CatechismJSON {
  type: 'catechism'
  id: string
  name: string
  sectionLabel: string
  itemLabel: string
  sections: { name: string; items: { q: string; a: string }[] }[]
}

type NonBibleJSON = CreedJSON | CatechismJSON

// Bump version string to force re-seed after JSON content changes
const NON_BIBLE_SEED_VERSIONS: Record<string, string> = {
  heidelberg: '2026-08-30',
}

async function seedNonBibleText(sourceType: TextSourceType, sourceId: string) {
  const expectedVersion = NON_BIBLE_SEED_VERSIONS[sourceId]
  if (expectedVersion) {
    const stored = localStorage.getItem(`seed_v:${sourceId}`)
    if (stored !== expectedVersion) {
      await db.verses.where('[sourceType+sourceId+translation]').equals([sourceType, sourceId, sourceId]).delete()
    } else {
      return
    }
  } else {
    const count = await db.verses.where('[sourceType+sourceId+translation]').equals([sourceType, sourceId, sourceId]).count()
    if (count > 0) return
  }

  const res = await fetch(`/textos/${sourceId}.json`)
  if (!res.ok) return
  const data: NonBibleJSON = await res.json()

  const items: TextItem[] = []

  if (data.type === 'creed') {
    for (let si = 0; si < data.sections.length; si++) {
      const section = data.sections[si]
      for (let ai = 0; ai < section.articles.length; ai++) {
        items.push({
          sourceType,
          sourceId,
          bookNumber: si,
          chapter: ai,
          verse: 0,
          text: section.articles[ai].trim(),
          translation: sourceId,
        })
      }
    }
  } else {
    for (let si = 0; si < data.sections.length; si++) {
      const section = data.sections[si]
      for (let ii = 0; ii < section.items.length; ii++) {
        const item = section.items[ii]
        items.push({
          sourceType,
          sourceId,
          bookNumber: si,
          chapter: ii,
          verse: 0,
          text: `Q. ${item.q}\n\nA. ${item.a}`,
          translation: sourceId,
        })
      }
    }
  }

  const chunkSize = 500
  for (let i = 0; i < items.length; i += chunkSize) {
    await db.verses.bulkAdd(items.slice(i, i + chunkSize))
  }

  const version = NON_BIBLE_SEED_VERSIONS[sourceId]
  if (version) localStorage.setItem(`seed_v:${sourceId}`, version)
}

export async function getCollectionProgress(collectionId: number, _translation: string) {
  const cv = await db.collectionVerses.where({ collectionId }).toArray()
  const total = cv.length
  const memorized = await db.progress
    .where('[verseId+translation]')
    .anyOf(cv.map((c) => [c.verseId, c.translation] as [string, string]))
    .count()
  return { total, memorized, percent: total > 0 ? Math.round((memorized / total) * 100) : 0 }
}

export async function recordWordAccuracy(
  verseId: string,
  translation: string,
  correctWords: Set<number>,
  incorrectWords: Set<number>,
  allWords: string[],
) {
  await Promise.all([
    ...[...correctWords].map(async (idx) => {
      const existing = await db.wordStats.where({ verseId, translation, wordIndex: idx }).first()
      if (existing) await db.wordStats.update(existing.id!, { correctCount: existing.correctCount + 1 })
      else
        await db.wordStats.put({
          verseId,
          translation,
          wordIndex: idx,
          word: allWords[idx] || '',
          correctCount: 1,
          incorrectCount: 0,
        })
    }),
    ...[...incorrectWords].map(async (idx) => {
      const existing = await db.wordStats.where({ verseId, translation, wordIndex: idx }).first()
      if (existing) await db.wordStats.update(existing.id!, { incorrectCount: existing.incorrectCount + 1 })
      else
        await db.wordStats.put({
          verseId,
          translation,
          wordIndex: idx,
          word: allWords[idx] || '',
          correctCount: 0,
          incorrectCount: 1,
        })
    }),
  ])
}

export async function getWordHeat(verseId: string, translation: string, wordCount: number): Promise<{ index: number; accuracy: number }[]> {
  const stats = await db.wordStats.where({ verseId, translation }).toArray()
  const map = new Map(stats.map((s) => [s.wordIndex, s]))
  const result: { index: number; accuracy: number }[] = []
  for (let i = 0; i < wordCount; i++) {
    const s = map.get(i)
    if (s && s.correctCount + s.incorrectCount > 0) {
      result.push({ index: i, accuracy: s.correctCount / (s.correctCount + s.incorrectCount) })
    } else {
      result.push({ index: i, accuracy: -1 })
    }
  }
  return result
}

/**
 * Appends one review to the history. Never updates in place — `progress` already tracks current
 * state; this table exists precisely to keep the rows `progress` overwrites.
 */
export async function recordReview(entry: Omit<ReviewLog, 'id'>) {
  await db.reviewLog.add(entry)
}

/**
 * Every review's timestamp, ascending. Walks the `reviewedAt` index instead of loading whole
 * rows — the log grows without bound, and streaks and the calendar only need the days.
 */
export async function reviewTimestamps(): Promise<number[]> {
  return (await db.reviewLog.orderBy('reviewedAt').keys()) as number[]
}

/** Stable identity for one review, so a replayed sync entry cannot double-count a day. */
export function reviewLogRowId(entry: Pick<ReviewLog, 'verseId' | 'translation' | 'reviewedAt'>) {
  return `${entry.verseId}|${entry.translation}|${entry.reviewedAt}`
}

export async function addCollectionToMemory(
  collectionId: number,
  translation: string,
  _progressIdFn: () => string,
  logChange: (entry: Omit<SyncLog, 'id' | 'userId' | 'synced' | 'createdAt'>) => void,
) {
  const [cv, { createEmptyCard }] = await Promise.all([db.collectionVerses.where({ collectionId }).toArray(), import('./srs')])

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
        lastReview: null,
      }),
    })
  }

  return toAdd.length
}

export async function addCollectionAsBlock(
  collectionId: number,
  translation: string,
  logChange: (entry: Omit<SyncLog, 'id' | 'userId' | 'synced' | 'createdAt'>) => void,
): Promise<number> {
  const [cv, { createEmptyCard }] = await Promise.all([db.collectionVerses.where({ collectionId }).sortBy('sortOrder'), import('./srs')])

  const chapterGroups = new Map<string, { book: number; chapter: number; verses: number[] }>()
  for (const c of cv) {
    const p = parseTextKey(c.verseId)
    if (p.sourceType !== 'bible') continue
    const gk = `${p.sectionIndex}:${p.blockIndex}`
    if (!chapterGroups.has(gk)) {
      chapterGroups.set(gk, { book: p.sectionIndex, chapter: p.blockIndex, verses: [] })
    }
    chapterGroups.get(gk)!.verses.push(p.itemIndex)
  }

  const toAdd: Progress[] = []
  await db.transaction('r', db.progress, async () => {
    for (const group of chapterGroups.values()) {
      if (group.verses.length < 2) continue
      const minV = Math.min(...group.verses)
      const maxV = Math.max(...group.verses)
      const blockId = textKey('bible', '', group.book, group.chapter, minV, maxV)
      const existing = await db.progress.where({ verseId: blockId, translation }).first()
      if (!existing) {
        const card = createEmptyCard()
        toAdd.push({
          verseId: blockId,
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
        lastReview: null,
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
