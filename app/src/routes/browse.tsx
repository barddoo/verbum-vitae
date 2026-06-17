import { useSearch } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BOOKS, DEFAULT_TRANSLATION, TRANSLATION_LABELS, TRANSLATIONS, type Translation } from 'shared/bible'
import { useLongPress } from '../hooks/use-long-press'
import { CHAPTER_COUNTS } from '../lib/chapter-counts'
import { db, ensureNonBibleTextSeeded, ensureTranslationSeeded, type TextSourceType, textKey } from '../lib/db'
import { createEmptyCard } from '../lib/srs'
import { cachedGet, cachedSet } from '../lib/storage'
import { logProgressChange } from '../lib/sync'
import { AVAILABLE_SOURCES, type SourceOption } from '../lib/text-sources'
import { SelectionBar } from './browse/selection-bar'

interface SearchResult {
  bookNumber: number
  chapter: number
  verse: number
  text: string
  ref: string
}

const loadingSpinner = <div className="loading">Carregando…</div>

function SourcePicker({ current, onChange }: { current: SourceOption; onChange: (s: SourceOption) => void }) {
  return (
    <div className="source-picker">
      <div className="source-picker-options">
        {AVAILABLE_SOURCES.map((s) => (
          <button
            type="button"
            key={`${s.type}:${s.id}`}
            className={`source-chip ${current.type === s.type && current.id === s.id ? 'active' : ''}`}
            onClick={() => onChange(s)}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export function BrowsePage() {
  const search = useSearch({ from: '/browse' })
  const [source, setSource] = useState<SourceOption>(() => AVAILABLE_SOURCES[0])
  const [translation, setTranslation] = useState<Translation>(() => (cachedGet('translation') as Translation | null) ?? DEFAULT_TRANSLATION)
  const [bookIndex, setBookIndex] = useState<number | null>(() => {
    const b = search.book ? Number(search.book) : null
    return b !== null && !Number.isNaN(b) && b >= 0 && b < BOOKS.length ? b : null
  })
  const [chapter, setChapter] = useState<number | null>(() => {
    const c = search.chapter ? Number(search.chapter) : null
    return c !== null && !Number.isNaN(c) && c > 0 ? c : null
  })
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

  const isBible = source.type === 'bible'

  const translationForSource = isBible ? translation : source.id

  const loadMemorizedVerses = useCallback(async () => {
    if (isBible) {
      await ensureTranslationSeeded(translation)
    } else {
      await ensureNonBibleTextSeeded(source.type as TextSourceType, source.id)
    }
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
      setSelectionMode(false)
      setSelectionAnchor(null)
      setSelectedVerses(new Set())
    } else {
      setLoadingVerses(true)
      await ensureNonBibleTextSeeded(source.type as TextSourceType, source.id)
      const rows = await db.verses
        .where({ sourceType: source.type, sourceId: source.id, bookNumber: bookIndex, translation: translationForSource })
        .sortBy('chapter')
      setVerses(rows.map((r) => r.text))
      setLoadingVerses(false)
      setSelectionMode(false)
      setSelectionAnchor(null)
      setSelectedVerses(new Set())
    }
  }, [bookIndex, chapter, isBible, translation, source.type, source.id, translationForSource])

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
    [translation, isBible],
  )

  useEffect(() => {
    loadMemorizedVerses()
  }, [translation, source, loadMemorizedVerses])

  useEffect(() => {
    if (bookIndex === null || chapter === null) return
    loadChapter()
  }, [bookIndex, chapter, translation, source, loadChapter])

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
    const keys = [...selectedVerses].map((v) => verseTextKey(v))
    const existingList = await Promise.all(
      keys.map((key) => db.progress.where({ verseId: key, translation: translationForSource }).first()),
    )
    const toAddKeys = keys.filter((_, i) => !existingList[i])

    if (toAddKeys.length === 0) {
      exitSelectionMode()
      return
    }

    const newProgress = toAddKeys.map((key) => {
      const card = createEmptyCard()
      return {
        verseId: key,
        translation: translationForSource,
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
        tableName: 'progress',
        rowId: p.verseId,
        operation: 'create',
        data: JSON.stringify({
          verseId: p.verseId,
          translation: translationForSource,
          cardJson: p.cardJson,
          state: p.state,
          dueDate: p.dueDate,
          streak: p.streak,
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
    if (!isBible) {
      return Array.from({ length: source.sectionCount }, (_, i) => ({ name: `${source.sectionLabel} ${i + 1}`, idx: i }))
    }
    return BOOKS.reduce<{ name: string; idx: number }[]>((acc, name, i) => {
      if (!bookQuery || name.toLowerCase().includes(bookQuery.toLowerCase())) acc.push({ name, idx: i })
      return acc
    }, [])
  }, [bookQuery, isBible, source])

  const sortedSelected = useMemo(() => [...selectedVerses].toSorted((a, b) => a - b), [selectedVerses])
  const chapterCount = isBible && bookIndex !== null ? CHAPTER_COUNTS[bookIndex] : verses.length

  function handleBookClick(idx: number) {
    if (isBible) {
      setBookIndex(idx)
      setChapter(null)
    } else {
      setBookIndex(idx)
      setChapter(1)
    }
  }
  const previewText = sortedSelected.length > 0 ? verses[sortedSelected[0] - 1] : ''

  function verseTextKey(v: number) {
    if (isBible) return textKey('bible', '', bookIndex!, chapter!, v)
    return textKey(source.type as TextSourceType, source.id, bookIndex!, v - 1, 0)
  }

  function isMemorized(v: number) {
    return memorizedVerses.has(verseTextKey(v))
  }

  function isAdded(v: number) {
    return justAdded.has(verseTextKey(v))
  }

  function handleSourceChange(s: SourceOption) {
    setSource(s)
    setBookIndex(null)
    setChapter(null)
    setVerses([])
    setSearchQuery('')
    setSearchResults([])
    setBookQuery('')
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
    <>
      <div className="page browse-page">
        <SourcePicker current={source} onChange={handleSourceChange} />

        <div className="browse-top">
          {isBible && (
            <div className="translate-picker">
              <select
                aria-label="Selecionar tradução"
                value={translation}
                onChange={(e) => {
                  const t = e.target.value as Translation
                  cachedSet('translation', t)
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
          )}

          <div className="search-bar">
            <input
              type="search"
              className="search-input"
              placeholder={isBible ? 'Buscar versículos…' : 'Buscar…'}
              aria-label="Buscar"
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

        {isBible && searchQuery.trim().length >= 2 && (
          <div className="search-results" aria-live="polite" aria-atomic="false">
            {searching ? (
              <div className="loading">Buscando…</div>
            ) : searchResults.length === 0 ? (
              <p className="search-empty">Nenhum resultado para &quot;{searchQuery}&quot;</p>
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
          <div className="book-list">
            {filteredBooks.length === 0 ? (
              <p className="search-empty">Nenhum livro encontrado</p>
            ) : (
              filteredBooks.flatMap(({ name, idx }) => {
                const items = []
                if (isBible) {
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
                }
                items.push(
                  <button type="button" key={`${idx}-${name}`} className="book-item" onClick={() => handleBookClick(idx)}>
                    {name}
                  </button>,
                )
                return items
              })
            )}
          </div>
        ) : (!searchQuery || searchQuery.trim().length < 2) && chapter === null ? (
          <div className="chapter-view">
            <button type="button" className="back-btn" onClick={() => setBookIndex(null)}>
              ← Voltar
            </button>
            <h3>{isBible ? BOOKS[bookIndex!] : source.name}</h3>
            <div className="chapter-grid">
              {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => (
                <button type="button" key={c} className="chapter-item" onClick={() => setChapter(c)}>
                  {isBible ? c : `${source.sectionLabel} ${c}`}
                </button>
              ))}
            </div>
          </div>
        ) : !searchQuery || searchQuery.trim().length < 2 ? (
          <div className={`verse-view${selectionMode ? ' select-mode' : ''}`}>
            <button type="button" className="back-btn" onClick={() => (isBible ? setChapter(null) : setBookIndex(null))}>
              ← {isBible ? BOOKS[bookIndex!] : source.name}
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
                  <h3>{isBible ? `${BOOKS[bookIndex!]} ${chapter}` : `${source.name} — ${source.sectionLabel} ${bookIndex! + 1}`}</h3>
                  <p className="verse-hint">Segure para selecionar</p>
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
                  const label = isBible ? v : `${source.itemLabel} ${v}`
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
                      <span className={`verse-num ${sel ? 'verse-num-selected' : ''}`}>{selectionMode ? (sel ? '✓' : '') : label}</span>
                      <span className="verse-text">{text}</span>
                      {add ? <span className="added-check">✓</span> : mem ? <span className="memorized-badge">Memorizado</span> : null}
                    </button>
                  )
                })}
          </div>
        ) : null}
      </div>
      <SelectionBar count={selectedVerses.size} previewText={previewText} onClear={exitSelectionMode} onMemorize={memorizeSelected} />
    </>
  )
}
