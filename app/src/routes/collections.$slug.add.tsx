import { plural, t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Check, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_TRANSLATION, getBooks, getTranslationLabels, TRANSLATIONS, type Translation } from 'shared/bible'
import { PageMeta } from '../components/page-meta'
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

export function AddVersesToCollectionPage() {
  const { i18n } = useLingui()
  const locale = i18n.locale
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
  const books = getBooks(locale)
  const translationLabels = getTranslationLabels(locale)

  return (
    <>
      <PageMeta
        title={t`Adicionar Versículos · Verbum Vitae`}
        description={t`Adicione versículos da Bíblia a uma coleção para memorização organizada por temas.`}
        path={`/collections/${slug}/add`}
      />
      <div className="page browse-page">
        <Link to="/collections/$slug" params={{ slug }} className="back-btn">
          ← {collectionName || t`Coleção`}
        </Link>
        <h3 className="add-verses-title">
          <Trans>Adicionar versículos</Trans>
        </h3>

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
              return books.map((name, i) => {
                const items: React.ReactNode[] = []
                if (i === 0)
                  items.push(
                    <div key="at-label" className="book-section-label">
                      <Trans>Antigo Testamento</Trans>
                    </div>,
                  )
                if (i === 39)
                  items.push(
                    <div key="nt-label" className="book-section-label">
                      <Trans>Novo Testamento</Trans>
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
        ) : (
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
                        <Check size={10} aria-hidden /> <Trans>Na coleção</Trans>
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
      {!adding && !done && (
        <SelectionBar
          count={selectedVerses.size}
          previewText={previewText}
          onClear={exitSelectionMode}
          onMemorize={handleAdd}
          actionLabel={t`Adicionar à coleção`}
        />
      )}
      {done && (
        <div className="selection-bar selection-bar-done">
          <span>
            <Check size={14} aria-hidden /> <Trans>Adicionado à coleção!</Trans>
          </span>
        </div>
      )}
    </>
  )
}
