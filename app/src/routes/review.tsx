import { useState, useEffect, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { db, fetchVersesForKey, parseVerseKey } from '../lib/db'
import { BOOKS } from 'shared/bible'
import { getDueCards, getNextCard, Rating, parseCardJson, type Card } from '../lib/srs'
import { logProgressChange } from '../lib/sync'

type ReviewMode = 'due' | 'free' | 'recent'

interface DueItem {
  progressId: number
  verseId: string
  reference: string
  verseText: string
  card: Card
  translation: string
}

function readModeFromURL(): ReviewMode {
  const p = new URLSearchParams(window.location.search)
  const m = p.get('mode')
  if (m === 'free' || m === 'recent') return m
  return 'due'
}

export function ReviewPage() {
  const [mode, setMode] = useState<ReviewMode>(readModeFromURL)
  const [items, setItems] = useState<DueItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadVerses = useCallback(async (currentMode: ReviewMode) => {
    setLoading(true)
    const allProgress = await db.progress.toArray()
    let selected: typeof allProgress = []

    if (currentMode === 'due') {
      const dueCards = getDueCards(allProgress)
      selected = allProgress.filter(p => dueCards.some(dc => dc.verseId === p.verseId))
    } else if (currentMode === 'recent') {
      selected = allProgress.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10)
    } else {
      selected = allProgress.sort(() => Math.random() - 0.5)
    }

    if (selected.length === 0) {
      setItems([]); setLoading(false); return
    }

    const loaded: DueItem[] = []
    for (const p of selected) {
      try {
        const card = parseCardJson(p.cardJson)
        const text = await fetchVersesForKey(p.verseId, p.translation)
        const parsed = parseVerseKey(p.verseId)
        const bookName = BOOKS[parsed.bookNumber]
        const ref = parsed.verseEnd
          ? `${bookName} ${parsed.chapter}:${parsed.verseStart}-${parsed.verseEnd}`
          : `${bookName} ${parsed.chapter}:${parsed.verseStart}`

        loaded.push({
          progressId: p.id!,
          verseId: p.verseId,
          reference: ref,
          verseText: text,
          card,
          translation: p.translation,
        })
      } catch {
        // skip malformed
      }
    }

    setItems(loaded)
    setCurrentIndex(0)
    setCompleted(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadVerses(mode)
  }, [mode, loadVerses])

  async function handleGrade(rating: Rating) {
    const item = items[currentIndex]
    if (!item) return

    const { card, dueDate, state } = getNextCard(item.card, rating)

    await db.progress.update(item.progressId, {
      cardJson: JSON.stringify(card),
      dueDate,
      state,
      streak: rating > 1 ? item.card.reps + 1 : 0,
      updatedAt: Date.now(),
    })

    logProgressChange({
      userId: localStorage.getItem('auth_token') ? 'user' : '',
      tableName: 'progress',
      rowId: item.verseId,
      operation: 'update',
      data: JSON.stringify({
        verseId: item.verseId,
        translation: item.translation,
        cardJson: JSON.stringify(card),
        nextReview: new Date(dueDate).toISOString(),
        lastReview: new Date().toISOString(),
      }),
    })

    setCompleted(prev => prev + 1)
    setTimeout(() => setCurrentIndex(prev => prev + 1), 100)
  }

  function switchMode(newMode: ReviewMode) {
    setMode(newMode)
  }

  if (loading) return <div className="page"><div className="loading">Carregando...</div></div>

  if (items.length === 0) {
    return (
      <div className="page review-empty">
        <ModeTabs currentMode={mode} onSwitch={switchMode} />
        <div className="empty-state">
          <h2>🎉 Nada para revisar!</h2>
          <p>Todos os versículos estão em dia.</p>
          <div className="empty-actions" style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300, margin: '0 auto' }}>
            <button className="btn btn-primary" onClick={() => switchMode('free')}>
              Praticar versículos
            </button>
            <Link to="/browse" className="btn btn-secondary">
              + Adicionar novos
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (currentIndex >= items.length) {
    return (
      <div className="page review-done">
        <div className="empty-state">
          <h2>✅ Sessão concluída!</h2>
          <p>{completed} versículos revisados.</p>
          <div className="empty-actions" style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300, margin: '0 auto' }}>
            <Link to="/" className="btn btn-primary">Início</Link>
            <button className="btn btn-secondary" onClick={() => switchMode('free')}>Nova sessão livre</button>
            <button className="btn btn-secondary" onClick={() => switchMode('due')}>Nova revisão</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page review-page">
      <ModeTabs currentMode={mode} onSwitch={switchMode} />

      <div className="review-header">
        <span className="review-counter">{currentIndex + 1} / {items.length}</span>
        <span className="review-progress">{completed} concluídos</span>
      </div>

      <FlashcardItem
        key={items[currentIndex].verseId}
        reference={items[currentIndex].reference}
        verseText={items[currentIndex].verseText}
        translation={items[currentIndex].translation}
        onGrade={handleGrade}
      />
    </div>
  )
}

function ModeTabs({ currentMode, onSwitch }: { currentMode: ReviewMode; onSwitch: (m: ReviewMode) => void }) {
  const tabs: { mode: ReviewMode; label: string }[] = [
    { mode: 'due', label: 'Revisão' },
    { mode: 'free', label: 'Praticar' },
    { mode: 'recent', label: 'Recentes' },
  ]

  return (
    <div className="mode-tabs">
      {tabs.map(t => (
        <button
          key={t.mode}
          className={`mode-tab ${currentMode === t.mode ? 'active' : ''}`}
          onClick={() => onSwitch(t.mode)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function FlashcardItem({ reference, verseText, translation, onGrade }: {
  reference: string
  verseText: string
  translation: string
  onGrade: (r: Rating) => void
}) {
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [hintLevel, setHintLevel] = useState(0)

  function getHiddenText(): string {
    if (hintLevel === 0) return ''
    const words = verseText.split(' ')
    return words.map((w, i) => {
      if (hintLevel === 1) {
        if (i < 3) return w
        return w[0] + '_'.repeat(Math.max(w.length - 1, 1))
      }
      if (i < hintLevel) return w
      return '_ '.repeat(w.length).trim()
    }).join(' ')
  }

  if (side === 'front') {
    return (
      <div className="flashcard">
        <div className="flashcard-front">
          <h2 className="flashcard-ref">{reference}</h2>
          <p className="flashcard-hint">Tente recitar o versículo mentalmente...</p>

          {hintLevel > 0 && (
            <div className="flashcard-hint-text">
              <p>{getHiddenText()}</p>
            </div>
          )}

          <div className="flashcard-actions">
            <button className="btn btn-secondary" onClick={() => setHintLevel(h => h + 1)}>
              Dica {hintLevel === 0 ? '(1ª letra)' : '(palavras)'}
            </button>
            <button className="btn btn-primary" onClick={() => setSide('back')}>
              Revelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flashcard">
      <div className="flashcard-back">
        <h3 className="flashcard-ref-back">{reference}</h3>
        <p className="flashcard-verse">{verseText}</p>
        <p className="flashcard-translation-label">{translation.toUpperCase()}</p>
      </div>

      <div className="flashcard-grade">
        <p className="grade-prompt">Como foi?</p>
        <div className="grade-buttons">
          <button className="btn grade-btn grade-1" onClick={() => { setSide('front'); setHintLevel(0); onGrade(Rating.Again) }}>
            1<br /><small>Esqueci</small>
          </button>
          <button className="btn grade-btn grade-2" onClick={() => { setSide('front'); setHintLevel(0); onGrade(Rating.Hard) }}>
            2<br /><small>Difícil</small>
          </button>
          <button className="btn grade-btn grade-3" onClick={() => { setSide('front'); setHintLevel(0); onGrade(Rating.Good) }}>
            3<br /><small>Bom</small>
          </button>
          <button className="btn grade-btn grade-4" onClick={() => { setSide('front'); setHintLevel(0); onGrade(Rating.Easy) }}>
            4<br /><small>Fácil</small>
          </button>
        </div>
      </div>
    </div>
  )
}
