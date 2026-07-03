import { db, type TextItem } from './schema'
import { parseTextKey, type TextSourceType } from './text-keys'

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

export function cleanVerseText(text: string, translation: string): string {
  let cleaned = text.replace(/<[^>]+>/g, '')
  if (translation === 'kjv') {
    cleaned = cleaned.replace(/\d+/g, '').replace(/\s+/g, ' ')
  }
  return cleaned.trim()
}

async function seedBibleText(translation: string) {
  const count = await db.verses.where({ sourceType: 'b', sourceId: '', translation }).count()
  if (count > 0) return

  let jsonData: { books: string[]; verses: { b: number; c: number; v: number; t: string }[] } | null = null

  try {
    const res = await fetch(`/bible-${translation}.json.br`)
    if (res.ok) {
      try {
        const buf = await res.arrayBuffer()
        const ds = new DecompressionStream('br' as CompressionFormat)
        const blob = new Blob([buf])
        const decompressed = await new Response(blob.stream().pipeThrough(ds)).text()
        jsonData = JSON.parse(decompressed)
      } catch {
        console.warn('Brotli unsupported, using uncompressed fallback')
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
    text: cleanVerseText(v.t, translation),
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

async function seedNonBibleText(sourceType: TextSourceType, sourceId: string) {
  const count = await db.verses.where({ sourceType, sourceId }).count()
  if (count > 0) return

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
}
