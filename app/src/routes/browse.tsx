import { useEffect, useMemo, useState } from 'react'
import { BOOKS, TRANSLATION_LABELS, TRANSLATIONS, type Translation } from 'shared/bible'
import { db, verseKey } from '../lib/db'
import { createEmptyCard } from '../lib/srs'
import { logProgressChange } from '../lib/sync'

export function BrowsePage() {
  const [translation, setTranslation] = useState<Translation>('ara')
  const [bookIndex, setBookIndex] = useState<number | null>(null)
  const [chapter, setChapter] = useState<number | null>(null)
  const [verses, setVerses] = useState<string[]>([])
  const [memorizedVerses, setMemorizedVerses] = useState<Set<string>>(new Set())
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set())
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadMemorizedVerses()
  }, [translation])

  useEffect(() => {
    if (bookIndex === null || chapter === null) return
    loadChapter()
  }, [bookIndex, chapter, translation])

  async function loadMemorizedVerses() {
    const progress = await db.progress.where({ translation }).toArray()
    setMemorizedVerses(new Set(progress.map((p) => p.verseId)))
  }

  async function loadChapter() {
    if (bookIndex === null || chapter === null) return
    const rows = await db.verses.where({ bookNumber: bookIndex, chapter, translation }).sortBy('verse')
    setVerses(rows.map((r) => r.text))
    setSelectedVerses(new Set())
  }

  function toggleVerse(v: number) {
    setSelectedVerses((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
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
    setSelectedVerses(new Set())
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

  return (
    <div className="page browse-page">
      <div className="translate-picker">
        <select value={translation} onChange={(e) => setTranslation(e.target.value as Translation)}>
          {TRANSLATIONS.map((t) => (
            <option key={t} value={t}>
              {TRANSLATION_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {bookIndex === null ? (
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
      ) : chapter === null ? (
        <div className="chapter-view">
          <button className="back-btn" onClick={() => setBookIndex(null)}>
            ← Voltar
          </button>
          <h3>{BOOKS[bookIndex]}</h3>
          <div className="chapter-grid">
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => (
              <button key={c} className="chapter-item" onClick={() => setChapter(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="verse-view">
          <button className="back-btn" onClick={() => setChapter(null)}>
            ← {BOOKS[bookIndex]}
          </button>

          <div className="verse-header">
            <h3>
              {BOOKS[bookIndex]} {chapter}
            </h3>
          </div>

          {verses.map((text, i) => {
            const v = i + 1
            const mem = isMemorized(v)
            const add = isAdded(v)
            const sel = selectedVerses.has(v)

            return (
              <div key={i} className={`verse-row ${mem ? 'memorized' : ''} ${sel ? 'selected' : ''}`} onClick={() => toggleVerse(v)}>
                <span className={`verse-num ${sel ? 'verse-num-selected' : ''}`}>{v}</span>
                <span className="verse-text">{text}</span>
                {add ? <span className="added-check">✓</span> : mem ? <span className="memorized-badge">Memorizado</span> : null}
              </div>
            )
          })}
        </div>
      )}

      {selectedVerses.size > 0 && (
        <div className="selection-bar">
          <div className="selection-bar-info">
            <span className="selection-bar-count">
              {selectedVerses.size} selecionado{selectedVerses.size > 1 ? 's' : ''}
            </span>
            <span className="selection-bar-preview">
              "{verses[sortedSelected[0] - 1]?.slice(0, 60)}{verses[sortedSelected[0] - 1]?.length > 60 ? '...' : ''}"
            </span>
          </div>
          <div className="selection-bar-actions">
            <button className="btn btn-sm btn-secondary" onClick={() => setSelectedVerses(new Set())}>
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
