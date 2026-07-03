import { plural, t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { useSearch } from '@tanstack/react-router'
import { Check, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { BOOKS, getBooks, TRANSLATION_LABELS, TRANSLATIONS, type Translation } from 'shared/bible'
import { PageMeta } from '../components/page-meta'
import { useBrowseData } from '../hooks/use-browse-data'
import { useVerseSelection } from '../hooks/use-verse-selection'
import { CHAPTER_COUNTS } from '../lib/chapter-counts'
import { cachedSet } from '../lib/storage'
import type { SourceOption } from '../lib/text-sources'
import { SelectionBar } from './browse/selection-bar'
import { SourcePicker } from './browse/source-picker'

const VerseImageModal = lazy(() => import('../components/verse-image/verse-image-modal').then((m) => ({ default: m.VerseImageModal })))

export function BrowsePage() {
  const { i18n } = useLingui()
  const locale = i18n.locale
  const search = useSearch({ from: '/browse' })
  const initialBook = (() => {
    const b = search.book ? Number(search.book) : null
    return b !== null && !Number.isNaN(b) && b >= 0 && b < BOOKS.length ? b : null
  })()
  const initialChapter = (() => {
    const c = search.chapter ? Number(search.chapter) : null
    return c !== null && !Number.isNaN(c) && c > 0 ? c : null
  })()

  const { selectedVerses, selectionMode, exitSelectionMode, longPress } = useVerseSelection()
  const {
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
  } = useBrowseData({ locale, initialBook, initialChapter, selectedVerses, exitSelectionMode })

  const [showImageModal, setShowImageModal] = useState(false)
  const books = getBooks(locale)

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

  const filteredBooks = useMemo(() => {
    if (!isBible) return Array.from({ length: source.sectionCount }, (_, i) => ({ name: `${source.sectionLabel} ${i + 1}`, idx: i }))
    return books.reduce<{ name: string; idx: number }[]>((acc, name, i) => {
      if (!bookQuery || name.toLowerCase().includes(bookQuery.toLowerCase())) acc.push({ name, idx: i })
      return acc
    }, [])
  }, [bookQuery, isBible, source, books])

  const sortedSelected = useMemo(() => [...selectedVerses].toSorted((a, b) => a - b), [selectedVerses])
  const chapterCount = isBible && bookIndex !== null ? CHAPTER_COUNTS[bookIndex] : verses.length
  const imageVerses = useMemo(() => {
    if (bookIndex === null || !isBible) return []
    return sortedSelected.map((v) => ({ ref: `${books[bookIndex]} ${chapter ?? 0}:${v}`, text: verses[v - 1] ?? '' }))
  }, [sortedSelected, bookIndex, chapter, verses, isBible, books])
  const imageBookName = bookIndex !== null && isBible ? books[bookIndex] : source.name
  const imageTranslation = isBible ? translation : source.id
  const previewText = sortedSelected.length > 0 ? verses[sortedSelected[0] - 1] : ''

  function isMemorized(v: number) {
    return memorizedVerses.has(verseTextKey(v))
  }
  function isAdded(v: number) {
    return justAdded.has(verseTextKey(v))
  }

  function handleBookClick(idx: number) {
    if (isBible) {
      setBookIndex(idx)
      setChapter(null)
    } else {
      setBookIndex(idx)
      setChapter(1)
    }
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

  const translationLabels = TRANSLATION_LABELS

  return (
    <>
      <PageMeta
        title={t`Bíblia · Verbum Vitae`}
        description={t`Explore e leia a Bíblia Sagrada em múltiplas traduções. Selecione livros, capítulos e versículos para estudo e memorização.`}
        path="/browse"
      />
      <div className="page browse-page">
        <SourcePicker current={source} onChange={handleSourceChange} />

        <div className="browse-top">
          {isBible && (
            <div className="translate-picker">
              <select
                aria-label={t`Selecionar tradução`}
                value={translation}
                onChange={(e) => {
                  const tx = e.target.value as Translation
                  cachedSet('translation', tx)
                  setTranslation(tx)
                }}
              >
                {TRANSLATIONS.map((tx) => (
                  <option key={tx} value={tx}>
                    {translationLabels[tx]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="search-bar">
            <input
              type="search"
              className="search-input"
              placeholder={isBible ? t`Buscar versículos…` : t`Buscar…`}
              aria-label={t`Buscar`}
              name="verse-search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="search-clear" aria-label={t`Limpar busca`} onClick={clearSearch}>
                <X size={14} aria-hidden />
              </button>
            )}
          </div>
        </div>

        {isBible && searchQuery.trim().length >= 2 && (
          <div className="search-results" aria-live="polite" aria-atomic="false">
            {searching ? (
              <div className="loading">
                <Trans>Buscando…</Trans>
              </div>
            ) : searchResults.length === 0 ? (
              <p className="search-empty">
                <Trans>Nenhum resultado para &quot;{searchQuery}&quot;</Trans>
              </p>
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
              <p className="search-empty">
                <Trans>Nenhum livro encontrado</Trans>
              </p>
            ) : (
              filteredBooks.flatMap(({ name, idx }) => {
                const items = []
                if (isBible) {
                  if (!bookQuery && idx === 0)
                    items.push(
                      <div key="at-label" className="book-section-label">
                        <Trans>Antigo Testamento</Trans>
                      </div>,
                    )
                  if (!bookQuery && idx === 39)
                    items.push(
                      <div key="nt-label" className="book-section-label">
                        <Trans>Novo Testamento</Trans>
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
              <Trans>← Voltar</Trans>
            </button>
            <h3>{isBible ? books[bookIndex!] : source.name}</h3>
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
              ← {isBible ? books[bookIndex!] : source.name}
            </button>
            <div className="verse-header">
              {selectionMode ? (
                <>
                  <span className="select-mode-label">
                    {selectedVerses.size > 0
                      ? plural(selectedVerses.size, { one: '# selecionado', other: '# selecionados' })
                      : t`Toque para selecionar`}
                  </span>
                  <button type="button" className="select-mode-exit" aria-label={t`Sair do modo seleção`} onClick={exitSelectionMode}>
                    <X size={16} aria-hidden />
                  </button>
                </>
              ) : (
                <>
                  <h3>{isBible ? `${books[bookIndex!]} ${chapter}` : `${source.name} — ${source.sectionLabel} ${bookIndex! + 1}`}</h3>
                  <p className="verse-hint">
                    <Trans>Segure para selecionar</Trans>
                  </p>
                </>
              )}
            </div>
            {loadingVerses ? (
              <div className="loading">
                <Trans>Carregando…</Trans>
              </div>
            ) : (
              verses.map((text, i) => {
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
                    <span className={`verse-num ${sel ? 'verse-num-selected' : ''}`}>
                      {selectionMode ? sel ? <Check size={10} aria-hidden /> : '' : label}
                    </span>
                    <span className="verse-text">{text}</span>
                    {add ? (
                      <span className="added-check">
                        <Check size={14} aria-hidden />
                      </span>
                    ) : mem ? (
                      <span className="memorized-badge">
                        <Check size={10} aria-hidden /> <Trans>Memorizado</Trans>
                      </span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        ) : null}
      </div>
      <SelectionBar
        count={selectedVerses.size}
        previewText={previewText}
        onClear={exitSelectionMode}
        onMemorize={memorizeSelected}
        onShareImage={imageVerses.length > 0 ? () => setShowImageModal(true) : undefined}
      />
      {showImageModal && (
        <Suspense fallback={null}>
          <VerseImageModal
            open={showImageModal}
            onClose={() => setShowImageModal(false)}
            verses={imageVerses}
            translation={imageTranslation}
            bookName={imageBookName}
          />
        </Suspense>
      )}
    </>
  )
}
