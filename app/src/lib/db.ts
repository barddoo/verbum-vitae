import Dexie, { type EntityTable } from 'dexie'
import type { VerseRow } from 'shared/types'

export interface Verse extends VerseRow {
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
  updatedAt: number
}

export interface Collection {
  id?: number
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
  verses: EntityTable<Verse, 'id'>
  progress: EntityTable<Progress, 'id'>
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

export function verseKey(bookNumber: number, chapter: number, verse: number, endVerse?: number): string {
  return endVerse ? `${bookNumber}_${chapter}_${verse}:${endVerse}` : `${bookNumber}_${chapter}_${verse}`
}

export interface VerseKeyParsed {
  bookNumber: number
  chapter: number
  verseStart: number
  verseEnd?: number
}

export function parseVerseKey(key: string): VerseKeyParsed {
  const parts = key.split('_')
  const bookNumber = parseInt(parts[0], 10)
  const chapter = parseInt(parts[1], 10)
  const verseParts = parts[2].split(':')
  return {
    bookNumber,
    chapter,
    verseStart: parseInt(verseParts[0], 10),
    verseEnd: verseParts[1] ? parseInt(verseParts[1], 10) : undefined,
  }
}

export function verseIdToReference(verseId: string, bookName: string): string {
  const p = parseVerseKey(verseId)
  if (p.verseEnd) return `${bookName} ${p.chapter}:${p.verseStart}-${p.verseEnd}`
  return `${bookName} ${p.chapter}:${p.verseStart}`
}

let seedingPromise: Promise<void> | null = null

export async function ensureVersesSeeded() {
  if (seedingPromise) return seedingPromise
  seedingPromise = (async () => {
    const count = await db.verses.count()
    if (count === 0) {
      await seedVerses('ara')
      await seedVerses('acf')
    }
  })()
  return seedingPromise
}

export async function fetchVersesForKey(verseId: string, translation: string): Promise<string> {
  await ensureVersesSeeded()
  const p = parseVerseKey(verseId)
  const endVerse = p.verseEnd || p.verseStart
  const rows = await db.verses.where('[bookNumber+chapter]').equals([p.bookNumber, p.chapter]).sortBy('verse')
  const filtered = rows.filter((r) => r.translation === translation && r.verse >= p.verseStart && r.verse <= endVerse)
  return filtered.map((r) => r.text).join(' ')
}

export async function fetchVersesBatch(keys: { verseId: string; translation: string }[]): Promise<Map<string, string>> {
  await ensureVersesSeeded()
  const chapterGroups = new Map<string, { keys: { verseId: string; translation: string }[] }>()
  for (const k of keys) {
    const p = parseVerseKey(k.verseId)
    const ck = `${p.bookNumber}_${p.chapter}`
    if (!chapterGroups.has(ck)) chapterGroups.set(ck, { keys: [] })
    chapterGroups.get(ck)!.keys.push(k)
  }

  const result = new Map<string, string>()
  for (const [ck, group] of chapterGroups) {
    const [bookNumStr, chapterNumStr] = ck.split('_')
    const rows = await db.verses
      .where('[bookNumber+chapter]')
      .equals([parseInt(bookNumStr, 10), parseInt(chapterNumStr, 10)])
      .toArray()
    for (const k of group.keys) {
      const p = parseVerseKey(k.verseId)
      const endVerse = p.verseEnd || p.verseStart
      const filtered = rows.filter((r) => r.translation === k.translation && r.verse >= p.verseStart && r.verse <= endVerse)
      result.set(k.verseId, filtered.map((r) => r.text).join(' '))
    }
  }
  return result
}

export async function seedVerses(translation: Verse['translation']) {
  const count = await db.verses.where({ translation }).count()
  if (count > 0) return

  try {
    const res = await fetch(`/bible-${translation}.json.br`)
    if (res.ok) {
      try {
        const buf = await res.arrayBuffer()
        const ds = new DecompressionStream('br' as CompressionFormat)
        const blob = new Blob([buf])
        const decompressed = await new Response(blob.stream().pipeThrough(ds)).text()
        const data = JSON.parse(decompressed)
        await bulkInsert(data, translation)
        return
      } catch {
        console.warn('Brotli unsupported, using uncompressed fallback')
      }
    }
  } catch {
    /* network error */
  }

  const fallback = await fetch(`/bible-${translation}.json`)
  if (!fallback.ok) return
  const data = await fallback.json()
  await bulkInsert(data, translation)
}

async function bulkInsert(
  data: { books: string[]; verses: { b: number; c: number; v: number; t: string }[] },
  translation: Verse['translation'],
) {
  const verses: Verse[] = data.verses.map((v) => ({ bookNumber: v.b, chapter: v.c, verse: v.v, text: v.t, translation }))
  const chunkSize = 500
  for (let i = 0; i < verses.length; i += chunkSize) {
    await db.verses.bulkAdd(verses.slice(i, i + chunkSize))
  }
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
  for (const idx of correctWords) {
    const existing = await db.wordStats.where({ verseId, translation, wordIndex: idx }).first()
    if (existing) await db.wordStats.update(existing.id!, { correctCount: existing.correctCount + 1 })
    else await db.wordStats.put({ verseId, translation, wordIndex: idx, word: allWords[idx] || '', correctCount: 1, incorrectCount: 0 })
  }
  for (const idx of incorrectWords) {
    const existing = await db.wordStats.where({ verseId, translation, wordIndex: idx }).first()
    if (existing) await db.wordStats.update(existing.id!, { incorrectCount: existing.incorrectCount + 1 })
    else await db.wordStats.put({ verseId, translation, wordIndex: idx, word: allWords[idx] || '', correctCount: 0, incorrectCount: 1 })
  }
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

export async function addCollectionToMemory(
  collectionId: number,
  _translation: string,
  _progressIdFn: () => string,
  logChange: (entry: Omit<SyncLog, 'id' | 'synced' | 'createdAt'>) => void,
) {
  const cv = await db.collectionVerses.where({ collectionId }).toArray()
  let added = 0
  for (const c of cv) {
    const existing = await db.progress.where({ verseId: c.verseId, translation: c.translation }).first()
    if (existing) continue
    const { createEmptyCard } = await import('./srs')
    const card = createEmptyCard()
    await db.progress.put({
      verseId: c.verseId,
      translation: c.translation,
      cardJson: JSON.stringify(card),
      state: 0,
      dueDate: card.due.getTime(),
      streak: 0,
      updatedAt: Date.now(),
    })
    logChange({
      userId: localStorage.getItem('auth_token') ? 'user' : '',
      tableName: 'progress',
      rowId: c.verseId,
      operation: 'create',
      data: JSON.stringify({
        verseId: c.verseId,
        translation: c.translation,
        cardJson: JSON.stringify(card),
        nextReview: new Date(card.due.getTime()).toISOString(),
        lastReview: new Date().toISOString(),
      }),
    })
    added++
  }
  return added
}
