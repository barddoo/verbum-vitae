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
  syncLog: EntityTable<SyncLog, 'id'>
}

db.version(1).stores({
  verses: '++id, &[bookNumber+chapter+verse+translation], [bookNumber+chapter], bookNumber, translation',
  progress: '++id, &[verseId+translation], dueDate, state, [dueDate+state]',
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
  if (p.verseEnd) {
    return `${bookName} ${p.chapter}:${p.verseStart}-${p.verseEnd}`
  }
  return `${bookName} ${p.chapter}:${p.verseStart}`
}

export async function fetchVersesForKey(verseId: string, translation: string): Promise<string> {
  const p = parseVerseKey(verseId)
  const endVerse = p.verseEnd || p.verseStart

  const rows = await db.verses.where('[bookNumber+chapter]').equals([p.bookNumber, p.chapter]).sortBy('verse')

  const filtered = rows.filter((r) => r.translation === translation && r.verse >= p.verseStart && r.verse <= endVerse)

  return filtered.map((r) => r.text).join(' ')
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
  const verses: Verse[] = data.verses.map((v) => ({
    bookNumber: v.b,
    chapter: v.c,
    verse: v.v,
    text: v.t,
    translation,
  }))
  const chunkSize = 500
  for (let i = 0; i < verses.length; i += chunkSize) {
    await db.verses.bulkAdd(verses.slice(i, i + chunkSize))
  }
}
