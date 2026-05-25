import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BOOKS, DEFAULT_TRANSLATION, TRANSLATION_LABELS, TRANSLATIONS, type Translation } from 'shared/bible'
import { useLongPress } from '../hooks/use-long-press'
import { CHAPTER_COUNTS } from '../lib/chapter-counts'
import { db, ensureTranslationSeeded, verseKey } from '../lib/db'
import { createEmptyCard } from '../lib/srs'
import { cachedGet } from '../lib/storage'
import { logProgressChange } from '../lib/sync'
import { SelectionBar } from './browse/selection-bar'

interface SearchResult {
  bookNumber: number
  chapter: number
  verse: number
  text: string
  ref: string
}

const loadingSpinner = <div className="loading">Carregando…</div>

export function BrowsePage() {
  const [translation, setTranslation] = useState<Translation>(
    () => (localStorage.getItem('translation') as Translation | null) ?? DEFAULT_TRANSLATION,
  )
  const [bookIndex, setBookIndex] = useState<number | null>(null)
  const [chapter, setChapter] = useState<number | null>(null)
  const [verses, setVerses] = useState<string[]>([])
  const [loadingVerses, setLoadingVerses] = useState(false)
  const [memorizedVerses, setMemorizedVerses] = useState<Set<string>>(new Set())
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set())
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [bookQuery, setBookQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadMemorizedVerses = useCallback(async () => {
    await ensureTranslationSeeded(translation)
    const progress = await db.progress.where({ translation }).toArray()
    setMemorizedVerses(new Set(progress.map((p) => p.verseId)))
  }, [translation])

  const loadChapter = useCallback(async () => {
    if (bookIndex === null || chapter === null) return
    setLoadingVerses(true)
    await ensureTranslationSeeded(translation)
    const rows = await db.verses.where({ bookNumber: bookIndex, chapter, translation }).sortBy('verse')
    setVerses(rows.map((r) => r.text))
    setLoadingVerses(false)
    setSelectionMode(false)
    setSelectionAnchor(null)
    setSelectedVerses(new Set())
  }, [bookIndex, chapter, translation])

  const doSearch = useCallback(
    async (query: string) => {
      setSearching(true)
      await ensureTranslationSeeded(translation)
      const lower = query.toLowerCase()
      const all = await db.verses
        .where({ translation })
        .filter((v) => v.text.toLowerCase().includes(lower))
        .limit(50)
        .toArray()
      const results: SearchResult[] = all.map((v) => ({
        bookNumber: v.bookNumber,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text,
        ref: `${BOOKS[v.bookNumber]} ${v.chapter}:${v.verse}`,
      }))
      setSearchResults(results)
      setSearching(false)
    },
    [translation],
  )

  useEffect(() => {
    loadMemorizedVerses()
  }, [translation, loadMemorizedVerses])

  useEffect(() => {
    if (bookIndex === null || chapter === null) return
    loadChapter()
  }, [bookIndex, chapter, translation, loadChapter])

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => doSearch(searchQuery.trim()), 300)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [searchQuery, translation, doSearch])

  function goToVerse(b: number, c: number) {
    setBookIndex(b)
    setChapter(c)
    setSearchQuery('')
    setSearchResults([])
  }

  function clearSearch() {
    setSearchQuery('')
    setSearchResults([])
  }

  function handleLongPress(v: number) {
    setSelectionMode(true)
    setSelectionAnchor(v)
    setSelectedVerses(new Set([v]))
  }

  function handleTap(v: number) {
    setSelectedVerses((prev) => {
      const next = new Set(prev)
      if (next.has(v)) {
        next.delete(v)
        if (v === selectionAnchor) setSelectionAnchor(null)
      } else if (selectionAnchor !== null) {
        const lo = Math.min(selectionAnchor, v)
        const hi = Math.max(selectionAnchor, v)
        for (let i = lo; i <= hi; i++) next.add(i)
        setSelectionAnchor(v)
      } else {
        next.add(v)
        setSelectionAnchor(v)
      }
      return next
    })
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectionAnchor(null)
    setSelectedVerses(new Set())
  }

  const longPress = useLongPress({
    onLongPress: handleLongPress,
    onTap: handleTap,
    enabled: !selectionMode,
  })

  async function memorizeSelected() {
    if (bookIndex === null || chapter === null || selectedVerses.size === 0) return
    const keys = [...selectedVerses].map((v) => verseKey(bookIndex, chapter, v))
    const existingList = await Promise.all(keys.map((key) => db.progress.where({ verseId: key, translation }).first()))
    const toAddKeys = keys.filter((_, i) => !existingList[i])
    const userId = cachedGet('auth_token') ? 'user' : ''

    if (toAddKeys.length === 0) {
      exitSelectionMode()
      return
    }

    const newProgress = toAddKeys.map((key) => {
      const card = createEmptyCard()
      return {
        verseId: key,
        translation,
        cardJson: JSON.stringify(card),
        state: 0,
        dueDate: card.due.getTime(),
        streak: 0,
        updatedAt: Date.now(),
      }
    })

    await db.progress.bulkAdd(newProgress)

    for (const p of newProgress) {
      const card = JSON.parse(p.cardJson)
      logProgressChange({
        userId,
        tableName: 'progress',
        rowId: p.verseId,
        operation: 'create',
        data: JSON.stringify({
          verseId: p.verseId,
          translation,
          cardJson: p.cardJson,
          nextReview: new Date(card.due).toISOString(),
          lastReview: new Date().toISOString(),
        }),
      })
    }

    setJustAdded(new Set(toAddKeys))
    exitSelectionMode()
    await loadMemorizedVerses()
    setTimeout(() => setJustAdded(new Set()), 2000)
  }

  const filteredBooks = useMemo(() => {
    return BOOKS.reduce<{ name: string; idx: number }[]>((acc, name, i) => {
      if (!bookQuery || name.toLowerCase().includes(bookQuery.toLowerCase())) acc.push({ name, idx: i })
      return acc
    }, [])
  }, [bookQuery])

  const sortedSelected = useMemo(() => [...selectedVerses].toSorted((a, b) => a - b), [selectedVerses])
  const chapterCount = bookIndex !== null ? CHAPTER_COUNTS[bookIndex] : 0
  const previewText = sortedSelected.length > 0 ? verses[sortedSelected[0] - 1] : ''

  function isMemorized(v: number) {
    return memorizedVerses.has(verseKey(bookIndex!, chapter!, v))
  }

  function isAdded(v: number) {
    return justAdded.has(verseKey(bookIndex!, chapter!, v))
  }

  function highlightMatch(text: string, query: string) {
    if (!query) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark>{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    )
  }

  return (
    <div className="page browse-page">
      <div className="browse-top">
        <div className="translate-picker">
          <select
            aria-label="Selecionar tradução"
            value={translation}
            onChange={(e) => {
              const t = e.target.value as Translation
              localStorage.setItem('translation', t)
              setTranslation(t)
            }}
          >
            {TRANSLATIONS.map((t) => (
              <option key={t} value={t}>
                {TRANSLATION_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="search-bar">
          <input
            type="search"
            className="search-input"
            placeholder="Buscar versículos…"
            aria-label="Buscar versículos"
            name="verse-search"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="search-clear" aria-label="Limpar busca" onClick={clearSearch}>
              ✕
            </button>
          )}
        </div>
      </div>

      {searchQuery.trim().length >= 2 && (
        <div className="search-results" aria-live="polite" aria-atomic="false">
          {searching ? (
            <div className="loading">Buscando…</div>
          ) : searchResults.length === 0 ? (
            <p className="search-empty">Nenhum resultado para "{searchQuery}"</p>
          ) : (
            searchResults.map((r) => (
              <button type="button" key={r.ref} className="search-result-row" onClick={() => goToVerse(r.bookNumber, r.chapter)}>
                <span className="search-result-ref">{r.ref}</span>
                <span className="search-result-text">{highlightMatch(r.text, searchQuery)}</span>
              </button>
            ))
          )}
        </div>
      )}

      {(!searchQuery || searchQuery.trim().length < 2) && bookIndex === null ? (
        <>
          <div className="search-bar book-search">
            <input
              type="search"
              className="search-input"
              placeholder="Buscar livro…"
              aria-label="Buscar livro"
              name="book-search"
              autoComplete="off"
              value={bookQuery}
              onChange={(e) => setBookQuery(e.target.value)}
            />
            {bookQuery && (
              <button type="button" className="search-clear" aria-label="Limpar busca de livro" onClick={() => setBookQuery('')}>
                ✕
              </button>
            )}
          </div>
          {filteredBooks.length === 0 ? (
            <p className="search-empty">Nenhum livro encontrado</p>
          ) : (
            <div className="book-list">
              {filteredBooks.flatMap(({ name, idx }) => {
                const items = []
                if (!bookQuery && idx === 0)
                  items.push(
                    <div key="at-label" className="book-section-label">
                      Antigo Testamento
                    </div>,
                  )
                if (!bookQuery && idx === 39)
                  items.push(
                    <div key="nt-label" className="book-section-label">
                      Novo Testamento
                    </div>,
                  )
                items.push(
                  <button
                    type="button"
                    key={name}
                    className="book-item"
                    onClick={() => {
                      setBookIndex(idx)
                      setChapter(null)
                    }}
                  >
                    {name}
                  </button>,
                )
                return items
              })}
            </div>
          )}
        </>
      ) : (!searchQuery || searchQuery.trim().length < 2) && chapter === null ? (
        <div className="chapter-view">
          <button type="button" className="back-btn" onClick={() => setBookIndex(null)}>
            ← Voltar
          </button>
          <h3>{BOOKS[bookIndex!]}</h3>
          <div className="chapter-grid">
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => (
              <button type="button" key={c} className="chapter-item" onClick={() => setChapter(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : !searchQuery || searchQuery.trim().length < 2 ? (
        <div className={`verse-view${selectionMode ? ' select-mode' : ''}`}>
          <button type="button" className="back-btn" onClick={() => setChapter(null)}>
            ← {BOOKS[bookIndex!]}
          </button>
          <div className="verse-header">
            {selectionMode ? (
              <>
                <span className="select-mode-label">
                  {selectedVerses.size > 0
                    ? `${selectedVerses.size} selecionado${selectedVerses.size !== 1 ? 's' : ''}`
                    : 'Toque para selecionar'}
                </span>
                <button type="button" className="select-mode-exit" aria-label="Sair do modo seleção" onClick={exitSelectionMode}>
                  ✕
                </button>
              </>
            ) : (
              <>
                <h3>
                  {BOOKS[bookIndex!]} {chapter}
                </h3>
                <p className="verse-hint">Segure um versículo para selecionar</p>
              </>
            )}
          </div>
          {loadingVerses
            ? loadingSpinner
            : verses.map((text, i) => {
                const v = i + 1
                const mem = isMemorized(v)
                const add = isAdded(v)
                const sel = selectedVerses.has(v)
                return (
                  <button
                    type="button"
                    key={i}
                    className={`verse-row ${mem ? 'memorized' : ''} ${sel ? 'selected' : ''}`}
                    onPointerDown={(e) => longPress.handlePointerDown(v, e)}
                    onPointerMove={longPress.handlePointerMove}
                    onPointerUp={() => longPress.handlePointerUp(v)}
                    onPointerCancel={longPress.handlePointerCancel}
                  >
                    <span className={`verse-num ${sel ? 'verse-num-selected' : ''}`}>{selectionMode ? (sel ? '✓' : '') : v}</span>
                    <span className="verse-text">{text}</span>
                    {add ? <span className="added-check">✓</span> : mem ? <span className="memorized-badge">Memorizado</span> : null}
                  </button>
                )
              })}
        </div>
      ) : null}

      <SelectionBar count={selectedVerses.size} previewText={previewText} onClear={exitSelectionMode} onMemorize={memorizeSelected} />
    </div>
  )
}
