import { useCallback, useRef, useState } from 'react'
import { DEFAULT_TRANSLATION, getBooks, type Translation } from 'shared/bible'
import { db, ensureNonBibleTextSeeded, ensureTranslationSeeded, type TextSourceType, textKey } from '../lib/db'
import { cachedGet } from '../lib/storage'
import { createAndLogProgress } from '../lib/sync'
import { AVAILABLE_SOURCES, type SourceOption } from '../lib/text-sources'

export interface SearchResult {
  bookNumber: number
  chapter: number
  verse: number
  text: string
  ref: string
}

interface UseBrowseDataParams {
  locale: string
  initialBook: number | null
  initialChapter: number | null
  selectedVerses: Set<number>
  exitSelectionMode: () => void
}

export function useBrowseData({ locale, initialBook, initialChapter, selectedVerses, exitSelectionMode }: UseBrowseDataParams) {
  const [source, setSource] = useState<SourceOption>(() => AVAILABLE_SOURCES[0])
  const [translation, setTranslation] = useState<Translation>(() => (cachedGet('translation') as Translation | null) ?? DEFAULT_TRANSLATION)
  const [bookIndex, setBookIndex] = useState<number | null>(initialBook)
  const [chapter, setChapter] = useState<number | null>(initialChapter)
  const [verses, setVerses] = useState<string[]>([])
  const [loadingVerses, setLoadingVerses] = useState(false)
  const [memorizedVerses, setMemorizedVerses] = useState<Set<string>>(new Set())
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [bookQuery, setBookQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isBible = source.type === 'bible'
  const translationForSource = isBible ? translation : source.id

  const loadMemorizedVerses = useCallback(async () => {
    if (isBible) await ensureTranslationSeeded(translation)
    else await ensureNonBibleTextSeeded(source.type as TextSourceType, source.id)
    const progress = await db.progress.where({ translation: translationForSource }).toArray()
    setMemorizedVerses(new Set(progress.map((p) => p.verseId)))
  }, [isBible, translation, source.type, source.id, translationForSource])

  const loadChapter = useCallback(async () => {
    if (bookIndex === null || chapter === null) return
    if (isBible) {
      setLoadingVerses(true)
      await ensureTranslationSeeded(translation)
      const rows = await db.verses.where({ sourceType: 'b', sourceId: '', bookNumber: bookIndex, chapter, translation }).sortBy('verse')
      setVerses(rows.map((r) => r.text))
      setLoadingVerses(false)
      exitSelectionMode()
    } else {
      setLoadingVerses(true)
      await ensureNonBibleTextSeeded(source.type as TextSourceType, source.id)
      const rows = await db.verses
        .where({ sourceType: source.type, sourceId: source.id, bookNumber: bookIndex, translation: translationForSource })
        .sortBy('chapter')
      setVerses(rows.map((r) => r.text))
      setLoadingVerses(false)
      exitSelectionMode()
    }
  }, [bookIndex, chapter, isBible, translation, source.type, source.id, translationForSource, exitSelectionMode])

  const doSearch = useCallback(
    async (query: string) => {
      if (!isBible) return
      setSearching(true)
      await ensureTranslationSeeded(translation)
      const lower = query.toLowerCase()
      const all = await db.verses
        .where({ sourceType: 'b', sourceId: '', translation })
        .filter((v) => v.text.toLowerCase().includes(lower))
        .limit(50)
        .toArray()
      const books = getBooks(locale)
      setSearchResults(
        all.map((v) => ({
          bookNumber: v.bookNumber,
          chapter: v.chapter,
          verse: v.verse,
          text: v.text,
          ref: `${books[v.bookNumber]} ${v.chapter}:${v.verse}`,
        })),
      )
      setSearching(false)
    },
    [translation, isBible, locale],
  )

  function verseTextKey(v: number) {
    return isBible ? textKey('bible', '', bookIndex!, chapter!, v) : textKey(source.type as TextSourceType, source.id, bookIndex!, v - 1, 0)
  }

  async function memorizeSelected() {
    if (bookIndex === null || chapter === null || selectedVerses.size === 0) return
    const keys = [...selectedVerses].map((v) => verseTextKey(v))
    const toAddKeys = await createAndLogProgress(keys, translationForSource)
    if (toAddKeys.length === 0) {
      exitSelectionMode()
      return
    }
    setJustAdded(new Set(toAddKeys))
    exitSelectionMode()
    await loadMemorizedVerses()
    setTimeout(() => setJustAdded(new Set()), 2000)
  }

  return {
    source,
    translation,
    bookIndex,
    chapter,
    verses,
    loadingVerses,
    memorizedVerses,
    justAdded,
    searchQuery,
    bookQuery,
    searchResults,
    searching,
    searchTimer,
    isBible,
    setSource,
    setTranslation,
    setBookIndex,
    setChapter,
    setVerses,
    setSearchQuery,
    setBookQuery,
    setSearchResults,
    loadMemorizedVerses,
    loadChapter,
    doSearch,
    memorizeSelected,
    verseTextKey,
  }
}
