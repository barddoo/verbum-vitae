import { useEffect, useMemo, useRef, useState } from 'react'
import { BOOKS, TRANSLATION_LABELS, TRANSLATIONS, type Translation } from 'shared/bible'
import { db, verseKey } from '../lib/db'
import { createEmptyCard } from '../lib/srs'
import { logProgressChange } from '../lib/sync'

interface SearchResult {
  bookNumber: number
  chapter: number
  verse: number
  text: string
  ref: string
}

export function BrowsePage() {
  const [translation, setTranslation] = useState<Translation>('ara')
  const [bookIndex, setBookIndex] = useState<number | null>(null)
  const [chapter, setChapter] = useState<number | null>(null)
  const [verses, setVerses] = useState<string[]>([])
  const [memorizedVerses, setMemorizedVerses] = useState<Set<string>>(new Set())
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set())
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerStart = useRef({ x: 0, y: 0 })
  const didLongPress = useRef(false)

  useEffect(() => {
    loadMemorizedVerses()
  }, [translation])

  useEffect(() => {
    if (bookIndex === null || chapter === null) return
    loadChapter()
  }, [bookIndex, chapter, translation])

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
  }, [searchQuery, translation])

  async function loadMemorizedVerses() {
    const progress = await db.progress.where({ translation }).toArray()
    setMemorizedVerses(new Set(progress.map((p) => p.verseId)))
  }

  async function loadChapter() {
    if (bookIndex === null || chapter === null) return
    const rows = await db.verses.where({ bookNumber: bookIndex, chapter, translation }).sortBy('verse')
    setVerses(rows.map((r) => r.text))
    setSelectionMode(false)
    setSelectionAnchor(null)
    setSelectedVerses(new Set())
  }

  async function doSearch(query: string) {
    setSearching(true)
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
  }

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

  function enterSelectionMode(v: number) {
    setSelectionMode(true)
    setSelectionAnchor(v)
    setSelectedVerses(new Set([v]))
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectionAnchor(null)
    setSelectedVerses(new Set())
  }

  function handleVerseSelectTap(v: number) {
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

  function handlePointerDown(v: number, e: React.PointerEvent<HTMLDivElement>) {
    didLongPress.current = false
    if (selectionMode) return
    pointerStart.current = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      navigator.vibrate?.(30)
      enterSelectionMode(v)
    }, 500)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!longPressTimer.current) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handlePointerUp(v: number) {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (didLongPress.current) return
    if (selectionMode) handleVerseSelectTap(v)
  }

  function handlePointerCancel() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  async function memorizeSelected() {
    if (bookIndex === null || chapter === null || selectedVerses.size === 0) return
    const keys: string[] = []
    for (const v of selectedVerses) {
      const key = verseKey(bookIndex, chapter, v)
      const existing = await db.progress.where({ verseId: key, translation }).first()
      if (existing) continue
      const card = createEmptyCard()
      await db.progress.put({
        verseId: key,
        translation,
        cardJson: JSON.stringify(card),
        state: 0,
        dueDate: card.due.getTime(),
        streak: 0,
        updatedAt: Date.now(),
      })
      logProgressChange({
        userId: localStorage.getItem('auth_token') ? 'user' : '',
        tableName: 'progress',
        rowId: key,
        operation: 'create',
        data: JSON.stringify({
          verseId: key,
          translation,
          cardJson: JSON.stringify(card),
          nextReview: new Date(card.due.getTime()).toISOString(),
          lastReview: new Date().toISOString(),
        }),
      })
      keys.push(key)
    }
    setJustAdded(new Set(keys))
    exitSelectionMode()
    await loadMemorizedVerses()
    setTimeout(() => setJustAdded(new Set()), 2000)
  }

  const sortedSelected = useMemo(() => [...selectedVerses].sort((a, b) => a - b), [selectedVerses])
  const chapterCount = useMemo(() => {
    if (bookIndex === null) return 0
    const counts = [
      50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3,
      2, 14, 4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22,
    ]
    return counts[bookIndex]
  }, [bookIndex])

  function isMemorized(v: number) {
    return memorizedVerses.has(verseKey(bookIndex!, chapter!, v))
  }
  function isAdded(v: number) {
    return justAdded.has(verseKey(bookIndex!, chapter!, v))
  }
  const previewText = sortedSelected.length > 0 ? verses[sortedSelected[0] - 1] : ''

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
          <select value={translation} onChange={(e) => setTranslation(e.target.value as Translation)}>
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
            placeholder="Buscar versículos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={clearSearch}>
              ✕
            </button>
          )}
        </div>
      </div>

      {searchQuery.trim().length >= 2 && (
        <div className="search-results">
          {searching ? (
            <div className="loading">Buscando...</div>
          ) : searchResults.length === 0 ? (
            <p className="search-empty">Nenhum resultado para "{searchQuery}"</p>
          ) : (
            searchResults.map((r, i) => (
              <div key={i} className="search-result-row" onClick={() => goToVerse(r.bookNumber, r.chapter)}>
                <span className="search-result-ref">{r.ref}</span>
                <span className="search-result-text">{highlightMatch(r.text, searchQuery)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {(!searchQuery || searchQuery.trim().length < 2) && bookIndex === null ? (
        <div className="book-list">
          {BOOKS.map((book, i) => (
            <button
              key={i}
              className="book-item"
              onClick={() => {
                setBookIndex(i)
                setChapter(null)
              }}
            >
              {book}
            </button>
          ))}
        </div>
      ) : (!searchQuery || searchQuery.trim().length < 2) && chapter === null ? (
        <div className="chapter-view">
          <button className="back-btn" onClick={() => setBookIndex(null)}>
            ← Voltar
          </button>
          <h3>{BOOKS[bookIndex!]}</h3>
          <div className="chapter-grid">
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => (
              <button key={c} className="chapter-item" onClick={() => setChapter(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : !searchQuery || searchQuery.trim().length < 2 ? (
        <div className={`verse-view${selectionMode ? ' select-mode' : ''}`}>
          <button className="back-btn" onClick={() => setChapter(null)}>
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
                <button className="select-mode-exit" onClick={exitSelectionMode}>
                  ✕
                </button>
              </>
            ) : (
              <h3>
                {BOOKS[bookIndex!]} {chapter}
              </h3>
            )}
          </div>
          {verses.map((text, i) => {
            const v = i + 1
            const mem = isMemorized(v)
            const add = isAdded(v)
            const sel = selectedVerses.has(v)
            return (
              <div
                key={i}
                className={`verse-row ${mem ? 'memorized' : ''} ${sel ? 'selected' : ''}`}
                onPointerDown={(e) => handlePointerDown(v, e)}
                onPointerMove={handlePointerMove}
                onPointerUp={() => handlePointerUp(v)}
                onPointerCancel={handlePointerCancel}
              >
                <span className={`verse-num ${sel ? 'verse-num-selected' : ''}`}>{selectionMode ? (sel ? '✓' : '') : v}</span>
                <span className="verse-text">{text}</span>
                {add ? <span className="added-check">✓</span> : mem ? <span className="memorized-badge">Memorizado</span> : null}
              </div>
            )
          })}
        </div>
      ) : null}

      {selectedVerses.size > 0 && (
        <div className="selection-bar">
          <div className="selection-bar-info">
            <span className="selection-bar-count">
              {selectedVerses.size} selecionado{selectedVerses.size > 1 ? 's' : ''}
            </span>
            <span className="selection-bar-preview">
              "{previewText.slice(0, 60)}
              {previewText.length > 60 ? '...' : ''}"
            </span>
          </div>
          <div className="selection-bar-actions">
            <button className="btn btn-sm btn-secondary" onClick={exitSelectionMode}>
              Limpar
            </button>
            <button className="btn btn-sm btn-primary" onClick={memorizeSelected}>
              Memorizar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
