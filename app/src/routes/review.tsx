import { useSearch } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DEFAULT_TRANSLATION, type Translation } from 'shared/bible'
import { db, fetchVersesBatch, parseTextKey } from '../lib/db'
import { verseIdToReference } from '../lib/format'
import { getNextCard } from '../lib/scheduler'
import { type Card, type Grade, getDueCards } from '../lib/srs'
import { cachedGet } from '../lib/storage'
import { logProgressChange } from '../lib/sync'
import { FillInBlankView } from './review/fill-in-blank-view'
import { FlashcardView } from './review/flashcard-view'
import { SessionComplete } from './review/session-complete'
import { TypingPracticeView } from './review/typing-practice-view'

type PracticeMode = 'flashcard' | 'fill-blank' | 'typing'

interface DueItem {
  progressId: number
  verseId: string
  reference: string
  verseText: string
  card: Card
  translation: string
  isQA: boolean
  question?: string
}

const loadingSpinner = <div className="loading">Carregando…</div>

export function ReviewPage() {
  const { autostart } = useSearch({ from: '/review' })
  const autostartFired = useRef(false)
  const [phase, setPhase] = useState<'queue' | 'session'>('queue')
  const [items, setItems] = useState<DueItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(
    () => (localStorage.getItem('review_mode') as PracticeMode) || 'fill-blank',
  )
  const [filterBook] = useState<number | null>(null)
  const [gradeHistory, setGradeHistory] = useState<Grade[]>([])
  const translation = (cachedGet('translation') as Translation | null) ?? DEFAULT_TRANSLATION

  useLayoutEffect(() => {
    if (phase === 'session') {
      document.body.classList.add('is-reviewing')
    } else {
      document.body.classList.remove('is-reviewing')
    }
    return () => document.body.classList.remove('is-reviewing')
  }, [phase])

  const allProgress = useLiveQuery(() => db.progress.toArray(), [])

  const totalAll = allProgress?.length ?? 0
  const totalDue = allProgress ? getDueCards(allProgress).length : 0
  const loading = allProgress === undefined

  const filterStatus = totalDue > 0 ? 'due' : 'all'

  function setAndPersistMode(m: PracticeMode) {
    setPracticeMode(m)
    localStorage.setItem('review_mode', m)
  }

  const startReview = useCallback(async () => {
    if (!allProgress) return
    setSessionLoading(true)

    let selected = allProgress
    if (filterStatus === 'due') {
      const dueCards = getDueCards(allProgress)
      selected = allProgress.filter((p) => dueCards.some((dc) => dc.verseId === p.verseId))
    }
    if (filterBook !== null) {
      selected = selected.filter((p) => parseTextKey(p.verseId).sectionIndex === filterBook)
    }
    if (selected.length === 0) {
      setSessionLoading(false)
      return
    }

    const cards = getDueCards(selected)
    const cardMap = new Map(cards.map((c) => [c.verseId, c.card]))

    const verseTexts = await fetchVersesBatch(selected.map((p) => ({ verseId: p.verseId, translation: p.translation })))

    const loaded: DueItem[] = []
    for (const p of selected) {
      const card = cardMap.get(p.verseId) || JSON.parse(p.cardJson || '{}')
      const rawText = verseTexts.get(p.verseId) || ''
      const parsed = parseTextKey(p.verseId)
      const isQA = parsed.sourceType === 'catechism' || parsed.sourceType === 'creed'

      let verseText = rawText
      let question: string | undefined
      if (parsed.sourceType === 'catechism' && rawText.includes('Q.')) {
        const qaParts = rawText.split('\n\nA. ')
        const parsedQuestion = qaParts[0]?.replace(/^Q\.\s*/, '').trim() || ''
        const parsedAnswer = qaParts.length > 1 ? qaParts[1].trim() : ''
        if (parsedQuestion && parsedAnswer) {
          question = parsedQuestion
          verseText = parsedAnswer
        } else if (parsedQuestion) {
          verseText = parsedQuestion
        }
      }

      loaded.push({
        progressId: p.id!,
        verseId: p.verseId,
        reference: verseIdToReference(p.verseId),
        verseText,
        card: typeof card === 'string' ? JSON.parse(card) : card,
        translation: p.translation,
        isQA,
        question,
      })
    }

    setItems(loaded)
    setCurrentIndex(0)
    setCompleted(0)
    setGradeHistory([])
    setPhase('session')
    setSessionLoading(false)
  }, [allProgress, filterStatus, filterBook, translation])

  useEffect(() => {
    if (!loading && autostart === '1' && totalAll > 0 && phase === 'queue' && !autostartFired.current) {
      autostartFired.current = true
      startReview()
    }
  }, [loading, autostart, totalAll, phase, startReview])

  async function handleGrade(rating: Grade) {
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
      tableName: 'progress',
      rowId: item.verseId,
      operation: 'update',
      data: JSON.stringify({
        verseId: item.verseId,
        translation: item.translation,
        cardJson: JSON.stringify(card),
        state,
        dueDate,
        streak: rating > 1 ? item.card.reps + 1 : 0,
        nextReview: new Date(dueDate).toISOString(),
        lastReview: new Date().toISOString(),
      }),
    })

    setCompleted((prev) => prev + 1)
    setGradeHistory((prev) => [...prev, rating])
    setTimeout(() => setCurrentIndex((prev) => prev + 1), 100)
  }

  function goBack() {
    setPhase('queue')
    setItems([])
    setCurrentIndex(0)
    setCompleted(0)
    setGradeHistory([])
  }

  if (loading || sessionLoading) return <div className="page">{loadingSpinner}</div>

  if (phase === 'queue') {
    const reviewCount = filterStatus === 'due' ? totalDue : totalAll
    return (
      <div className="page review-page">
        <div className="review-queue-hero">
          <span className="review-queue-big-num">{reviewCount}</span>
          <span className="review-queue-big-label">
            {totalAll === 0 ? 'nenhum texto memorizado' : reviewCount === 1 ? 'texto para revisar' : 'textos para revisar'}
          </span>
          {filterStatus === 'due' && totalAll > totalDue && totalAll > 0 && (
            <span className="review-queue-total-hint">{totalAll} total</span>
          )}
        </div>
        <div className="review-mode-grid">
          {(['fill-blank', 'flashcard', 'typing'] as PracticeMode[]).map((m) => (
            <button
              type="button"
              key={m}
              className={`review-mode-card ${practiceMode === m ? 'active' : ''}`}
              onClick={() => setAndPersistMode(m)}
            >
              <span className="review-mode-card-title">
                {m === 'flashcard' ? 'Flashcard' : m === 'fill-blank' ? 'Completar' : 'Digitar'}
              </span>
              <span className="review-mode-card-desc">
                {m === 'flashcard' ? 'Recite mentalmente' : m === 'fill-blank' ? 'Preencha lacunas' : 'Digite de memória'}
              </span>
            </button>
          ))}
        </div>
        {filterStatus === 'due' && totalDue === 0 && totalAll > 0 ? (
          <div className="queue-up-to-date">
            <p className="queue-up-to-date-msg">Você está em dia!</p>
            <p className="queue-up-to-date-hint">Volte amanhã para a próxima revisão.</p>
          </div>
        ) : (
          <button type="button" className="btn btn-primary btn-large btn-start" onClick={startReview} disabled={totalAll === 0}>
            {totalAll === 0 ? 'Adicione textos para começar' : 'Iniciar Revisão'}
          </button>
        )}
        {totalAll === 0 && (
          <p className="queue-empty-hint">
            Vá para <a href="/browse">Textos</a> para adicionar itens.
          </p>
        )}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="page review-page">
        <div className="empty-state">
          <h2>Nada para revisar!</h2>
          <p>{filterStatus === 'due' ? 'Todos os textos estão em dia.' : 'Nenhum texto encontrado.'}</p>
          <div className="empty-actions">
            <button type="button" className="btn btn-secondary" onClick={goBack}>
              Voltar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (currentIndex >= items.length) {
    return (
      <SessionComplete
        completed={completed}
        gradeHistory={gradeHistory}
        reviewedItems={items}
        onGoBack={goBack}
        onNewSession={() => {
          setCurrentIndex(0)
          setCompleted(0)
          setGradeHistory([])
        }}
      />
    )
  }

  const currentItem = items[currentIndex]

  return (
    <div className="page review-page review-session">
      <div className="review-header">
        <button type="button" className="btn-icon" onClick={goBack} aria-label="Voltar">
          ←
        </button>
        <div className="review-header-center">
          <span className="review-counter">
            {currentIndex + 1}/{items.length}
          </span>
          <div className="practice-mode-selector">
            {(['fill-blank', 'flashcard', 'typing'] as PracticeMode[]).map((m) => (
              <button
                type="button"
                key={m}
                className={`mode-dot ${practiceMode === m ? 'active' : ''}`}
                onClick={() => setAndPersistMode(m)}
                aria-label={m}
                title={m === 'flashcard' ? 'Flashcard' : m === 'fill-blank' ? 'Completar' : 'Digitar'}
              />
            ))}
            <span className="mode-label">
              {practiceMode === 'flashcard' ? 'Flashcard' : practiceMode === 'fill-blank' ? 'Completar' : 'Digitar'}
            </span>
          </div>
        </div>
        <span className="review-completed" title="Concluídos">
          {completed} ✓
        </span>
      </div>
      <div className="review-progress-bar">
        <div className="review-progress-fill" style={{ width: `${(currentIndex / items.length) * 100}%` }} />
      </div>

      {practiceMode === 'flashcard' && (
        <FlashcardView
          key={currentItem.verseId + currentIndex}
          reference={currentItem.reference}
          verseText={currentItem.verseText}
          translation={currentItem.translation}
          verseId={currentItem.verseId}
          onGrade={handleGrade}
          question={currentItem.question}
        />
      )}
      {practiceMode === 'fill-blank' && (
        <FillInBlankView
          key={currentItem.verseId + currentIndex}
          reference={currentItem.reference}
          verseText={currentItem.verseText}
          translation={currentItem.translation}
          verseId={currentItem.verseId}
          onGrade={handleGrade}
          question={currentItem.question}
        />
      )}
      {practiceMode === 'typing' && (
        <TypingPracticeView
          key={currentItem.verseId + currentIndex}
          reference={currentItem.reference}
          verseText={currentItem.verseText}
          translation={currentItem.translation}
          verseId={currentItem.verseId}
          onGrade={handleGrade}
          question={currentItem.question}
        />
      )}
    </div>
  )
}
