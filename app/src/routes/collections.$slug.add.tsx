import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Check, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BOOKS, DEFAULT_TRANSLATION, TRANSLATION_LABELS, TRANSLATIONS, type Translation } from 'shared/bible'
import { useLongPress } from '../hooks/use-long-press'
import { CHAPTER_COUNTS } from '../lib/chapter-counts'
import { addVersesToCollection, db, ensureNonBibleTextSeeded, ensureTranslationSeeded, type TextSourceType, textKey } from '../lib/db'
import { cachedGet, cachedSet } from '../lib/storage'
import { AVAILABLE_SOURCES, type SourceOption } from '../lib/text-sources'
import { SelectionBar } from './browse/selection-bar'

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

const loadingSpinner = <div className="loading">Carregando…</div>

export function AddVersesToCollectionPage() {
  const { slug } = useParams({ from: '/collections/$slug/add' })
  const navigate = useNavigate()

  const [collectionName, setCollectionName] = useState('')
  const [collectionId, setCollectionId] = useState<number | null>(null)

  const [source, setSource] = useState<SourceOption>(() => AVAILABLE_SOURCES[0])
  const [translation, setTranslation] = useState<Translation>(() => (cachedGet('translation') as Translation | null) ?? DEFAULT_TRANSLATION)
  const [bookIndex, setBookIndex] = useState<number | null>(null)
  const [chapter, setChapter] = useState<number | null>(null)
  const [verses, setVerses] = useState<string[]>([])
  const [loadingVerses, setLoadingVerses] = useState(false)
  const [existingVerses, setExistingVerses] = useState<Set<string>>(new Set())
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [done, setDone] = useState(false)

  const isBible = source.type === 'bible'
  const translationForSource = isBible ? translation : source.id

  useEffect(() => {
    async function loadCollection() {
      const col = await db.collections.where({ slug }).first()
      if (!col) {
        navigate({ to: '/collections' })
        return
      }
      setCollectionName(col.name)
      setCollectionId(col.id!)

      const existing = await db.collectionVerses.where({ collectionId: col.id! }).toArray()
      setExistingVerses(new Set(existing.map((v) => `${v.verseId}|${v.translation}`)))
    }
    loadCollection()
  }, [slug, navigate])

  const loadChapter = useCallback(async () => {
    if (bookIndex === null || chapter === null) return
    if (isBible) {
      setLoadingVerses(true)
      await ensureTranslationSeeded(translation)
      const rows = await db.verses.where({ sourceType: 'b', sourceId: '', bookNumber: bookIndex, chapter, translation }).sortBy('verse')
      setVerses(rows.map((r) => r.text))
      setLoadingVerses(false)
    } else {
      setLoadingVerses(true)
      await ensureNonBibleTextSeeded(source.type as TextSourceType, source.id)
      const rows = await db.verses
        .where({ sourceType: source.type, sourceId: source.id, bookNumber: bookIndex, translation: translationForSource })
        .sortBy('chapter')
      setVerses(rows.map((r) => r.text))
      setLoadingVerses(false)
    }
    setSelectionMode(false)
    setSelectionAnchor(null)
    setSelectedVerses(new Set())
  }, [bookIndex, chapter, isBible, translation, source.type, source.id, translationForSource])

  useEffect(() => {
    if (bookIndex === null || chapter === null) return
    loadChapter()
  }, [bookIndex, chapter, translation, source, loadChapter])

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

  function verseTextKey(v: number) {
    if (isBible) return textKey('bible', '', bookIndex!, chapter!, v)
    return textKey(source.type as TextSourceType, source.id, bookIndex!, v - 1, 0)
  }

  function isExisting(v: number) {
    return existingVerses.has(`${verseTextKey(v)}|${translationForSource}`)
  }

  async function handleAdd() {
    if (collectionId === null || selectedVerses.size === 0) return
    setAdding(true)

    const verseEntries = [...selectedVerses].map((v) => ({
      verseId: verseTextKey(v),
      translation: translationForSource,
    }))

    await addVersesToCollection(collectionId, verseEntries)

    setDone(true)
    setAdding(false)
    setTimeout(() => {
      navigate({ to: '/collections/$slug', params: { slug } })
    }, 800)
  }

  const sortedSelected = useMemo(() => [...selectedVerses].toSorted((a, b) => a - b), [selectedVerses])
  const previewText = sortedSelected.length > 0 ? verses[sortedSelected[0] - 1] : ''
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

  function handleSourceChange(s: SourceOption) {
    setSource(s)
    setBookIndex(null)
    setChapter(null)
    setVerses([])
  }

  const isNonBibleSectioned = !isBible && source.type === 'creed'

  return (
    <>
      <div className="page browse-page">
        <Link to="/collections/$slug" params={{ slug }} className="back-btn">
          ← {collectionName || 'Coleção'}
        </Link>
        <h3 className="add-verses-title">Adicionar versículos</h3>

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
        </div>

        {bookIndex === null ? (
          <div className="book-list">
            {(() => {
              if (!isBible) {
                return Array.from({ length: source.sectionCount }, (_, i) => i).map((idx) => (
                  <button type="button" key={idx} className="book-item" onClick={() => handleBookClick(idx)}>
                    {isNonBibleSectioned ? `${source.sectionLabel} ${idx + 1}` : `${source.sectionLabel} ${idx + 1}`}
                  </button>
                ))
              }
              return BOOKS.map((name, i) => {
                const items: React.ReactNode[] = []
                if (i === 0)
                  items.push(
                    <div key="at-label" className="book-section-label">
                      Antigo Testamento
                    </div>,
                  )
                if (i === 39)
                  items.push(
                    <div key="nt-label" className="book-section-label">
                      Novo Testamento
                    </div>,
                  )
                items.push(
                  <button type="button" key={`${i}-${name}`} className="book-item" onClick={() => handleBookClick(i)}>
                    {name}
                  </button>,
                )
                return items
              })
            })()}
          </div>
        ) : chapter === null ? (
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
        ) : (
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
                    <X size={16} aria-hidden />
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
                  const exist = isExisting(v)
                  const sel = selectedVerses.has(v)
                  const label = isBible ? v : `${source.itemLabel} ${v}`
                  return (
                    <button
                      type="button"
                      key={i}
                      className={`verse-row ${exist ? 'memorized' : ''} ${sel ? 'selected' : ''}`}
                      onPointerDown={(e) => longPress.handlePointerDown(v, e)}
                      onPointerMove={longPress.handlePointerMove}
                      onPointerUp={() => longPress.handlePointerUp(v)}
                      onPointerCancel={longPress.handlePointerCancel}
                      disabled={exist}
                    >
                      <span className={`verse-num ${sel ? 'verse-num-selected' : ''}`}>
                        {selectionMode ? sel ? <Check size={10} aria-hidden /> : '' : label}
                      </span>
                      <span className="verse-text">{text}</span>
                      {exist && (
                        <span className="memorized-badge">
                          <Check size={10} aria-hidden /> Na coleção
                        </span>
                      )}
                    </button>
                  )
                })}
          </div>
        )}
      </div>
      {!adding && !done && (
        <SelectionBar
          count={selectedVerses.size}
          previewText={previewText}
          onClear={exitSelectionMode}
          onMemorize={handleAdd}
          actionLabel="Adicionar à coleção"
        />
      )}
      {done && (
        <div className="selection-bar selection-bar-done">
          <span>
            <Check size={14} aria-hidden /> Adicionado à coleção!
          </span>
        </div>
      )}
    </>
  )
}
