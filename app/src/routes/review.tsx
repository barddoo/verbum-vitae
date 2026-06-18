import { useSearch } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { type CollectionVerse, db, fetchVersesBatch, parseTextKey } from '../lib/db'
import { verseIdToReference } from '../lib/format'
import { getNextCard } from '../lib/scheduler'
import { type Card, type Grade, getDueCards, parseCardJson } from '../lib/srs'
import { logProgressChange } from '../lib/sync'
import { FillInBlankView } from './review/fill-in-blank-view'
import { FlashcardView } from './review/flashcard-view'
import { SessionComplete } from './review/session-complete'
import { TypingPracticeView } from './review/typing-practice-view'

type PracticeMode = 'flashcard' | 'fill-blank' | 'typing'
type CardStateFilter = 'all' | 'new' | 'learning' | 'review'

const LIMIT_OPTIONS = [5, 10, 20, 50] as const

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
  const [progressiveBlanks, setProgressiveBlanks] = useState(() => localStorage.getItem('review_fill_blank_progressive') === '1')
  const [gradeHistory, setGradeHistory] = useState<Grade[]>([])
  const [skipped, setSkipped] = useState(0)
  const [filterVerseIds, setFilterVerseIds] = useState<string[] | null>(() => {
    const saved = localStorage.getItem('review_verse_selection')
    if (saved) {
      localStorage.removeItem('review_verse_selection')
      return JSON.parse(saved) as string[]
    }
    return null
  })
  const [filterCollectionId, setFilterCollectionId] = useState<number | null>(() => {
    const saved = localStorage.getItem('review_collection_id')
    return saved ? Number(saved) : null
  })
  const [filterCardState, setFilterCardState] = useState<CardStateFilter>('all')
  const [sessionLimit, setSessionLimit] = useState<number | null>(() => {
    const saved = localStorage.getItem('review_session_limit')
    return saved ? Number(saved) : null
  })
  const sessionOffsetRef = useRef(0)
  useLayoutEffect(() => {
    if (phase === 'session') {
      document.body.classList.add('is-reviewing')
    } else {
      document.body.classList.remove('is-reviewing')
    }
    return () => document.body.classList.remove('is-reviewing')
  }, [phase])

  const allProgress = useLiveQuery(() => db.progress.toArray(), [])
  const collections = useLiveQuery(() => db.collections.toArray(), [])
  const allCollectionVerses = useLiveQuery(() => db.collectionVerses.toArray(), [])
  const collectionVerseIds = useLiveQuery<CollectionVerse[] | null>(
    () => (filterCollectionId != null ? db.collectionVerses.where({ collectionId: filterCollectionId }).toArray() : Promise.resolve(null)),
    [filterCollectionId],
  )

  const progressVerseIds = useMemo(() => {
    if (!allProgress) return new Set<string>()
    return new Set(allProgress.map((p) => p.verseId))
  }, [allProgress])

  const dueVerseIds = useMemo(() => {
    if (!allProgress) return new Set<string>()
    return new Set(getDueCards(allProgress).map((d) => d.verseId))
  }, [allProgress])

  const collectionProgress = useMemo(() => {
    if (!allCollectionVerses) return new Map<number, { total: number; due: number }>()
    const map = new Map<number, { total: number; due: number }>()
    for (const cv of allCollectionVerses) {
      if (progressVerseIds.has(cv.verseId)) {
        const entry = map.get(cv.collectionId) || { total: 0, due: 0 }
        entry.total++
        if (dueVerseIds.has(cv.verseId)) entry.due++
        map.set(cv.collectionId, entry)
      }
    }
    return map
  }, [allCollectionVerses, progressVerseIds, dueVerseIds])

  const totalAll = allProgress?.length ?? 0
  const totalDue = allProgress ? getDueCards(allProgress).length : 0
  const loading = allProgress === undefined

  const filterStatus = totalDue > 0 ? 'due' : 'all'

  const filteredProgress = useMemo(() => {
    if (!allProgress) return []

    // pinned verse selection bypasses all other filters
    if (filterVerseIds !== null) {
      const idSet = new Set(filterVerseIds)
      return allProgress.filter((p) => idSet.has(p.verseId))
    }

    let base: typeof allProgress
    if (filterStatus === 'due') {
      const dueCards = getDueCards(allProgress)
      const dueSet = new Set(dueCards.map((d) => d.verseId))
      base = allProgress.filter((p) => dueSet.has(p.verseId))
    } else {
      base = allProgress
    }

    if (filterCollectionId !== null) {
      if (!collectionVerseIds) return []
      const cvSet = new Set(collectionVerseIds.map((cv) => cv.verseId))
      base = base.filter((p) => cvSet.has(p.verseId))
    }

    if (filterCardState !== 'all') {
      base = base.filter((p) => {
        try {
          const card = parseCardJson(p.cardJson)
          if (filterCardState === 'new') return card.state === 0
          if (filterCardState === 'learning') return card.state === 1 || card.state === 3
          if (filterCardState === 'review') return card.state === 2
        } catch {
          return false
        }
        return true
      })
    }

    return base
  }, [allProgress, filterVerseIds, filterStatus, filterCollectionId, collectionVerseIds, filterCardState])

  const reviewCount = sessionLimit ? Math.min(filteredProgress.length, sessionLimit) : filteredProgress.length

  function setAndPersistMode(m: PracticeMode) {
    setPracticeMode(m)
    localStorage.setItem('review_mode', m)
  }

  function setAndPersistLimit(limit: number | null) {
    setSessionLimit(limit)
    if (limit !== null) {
      localStorage.setItem('review_session_limit', String(limit))
    } else {
      localStorage.removeItem('review_session_limit')
    }
  }

  function setAndPersistCollectionId(id: number | null) {
    setFilterCollectionId(id)
    if (id !== null) {
      localStorage.setItem('review_collection_id', String(id))
    } else {
      localStorage.removeItem('review_collection_id')
    }
  }

  useEffect(() => {
    if (filterCollectionId !== null && collections && !collections.some((c) => c.id === filterCollectionId)) {
      setFilterCollectionId(null)
      localStorage.removeItem('review_collection_id')
    }
  }, [collections, filterCollectionId])

  const startReview = useCallback(async () => {
    if (!allProgress || filteredProgress.length === 0) return
    setSessionLoading(true)

    const end = sessionLimit ? sessionOffsetRef.current + sessionLimit : filteredProgress.length
    const selected = filteredProgress.slice(sessionOffsetRef.current, end)

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
    setSkipped(0)
    setGradeHistory([])
    setPhase('session')
    setSessionLoading(false)
  }, [allProgress, filteredProgress, sessionLimit])

  useEffect(() => {
    sessionOffsetRef.current = 0
  }, [filteredProgress])

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

  function handleSkip() {
    setSkipped((prev) => prev + 1)
    setTimeout(() => setCurrentIndex((prev) => prev + 1), 100)
  }

  function goBack() {
    setPhase('queue')
    setItems([])
    setCurrentIndex(0)
    setCompleted(0)
    setSkipped(0)
    setGradeHistory([])
    sessionOffsetRef.current = 0
  }

  if (loading || sessionLoading) return <div className="page">{loadingSpinner}</div>

  if (phase === 'queue') {
    const hasCollections = collections && collections.length > 0
    const noFiltersActive = filterVerseIds === null && filterCollectionId === null && filterCardState === 'all'

    return (
      <div className="page review-page">
        <div className="review-queue-hero">
          <span className="review-queue-big-num">{reviewCount}</span>
          <span className="review-queue-big-label">
            {totalAll === 0 ? 'nenhum texto memorizado' : reviewCount === 1 ? 'texto para revisar' : 'textos para revisar'}
          </span>
          {filterStatus === 'due' && noFiltersActive && totalAll > totalDue && totalAll > 0 && (
            <span className="review-queue-total-hint">{totalAll} total</span>
          )}
        </div>

        {filterVerseIds !== null ? (
          <div className="review-pinned-filter">
            <span className="review-pinned-label">
              {filterVerseIds.length} {filterVerseIds.length === 1 ? 'versículo selecionado' : 'versículos selecionados'}
            </span>
            <button type="button" className="review-pinned-clear" onClick={() => setFilterVerseIds(null)} aria-label="Limpar seleção">
              ×
            </button>
          </div>
        ) : (
          <>
            {hasCollections && (
              <div className="review-filter-section">
                <span className="review-filter-label">Coleção</span>
                <div className="source-picker-options">
                  <button
                    type="button"
                    className={`source-chip ${filterCollectionId === null ? 'active' : ''}`}
                    onClick={() => setAndPersistCollectionId(null)}
                  >
                    Todas
                  </button>
                  {collections
                    .filter((c) => c.isBuiltin === 0 || (collectionProgress.get(c.id!)?.total ?? 0) > 0)
                    .map((c) => {
                      const due = collectionProgress.get(c.id!)?.due ?? 0
                      return (
                        <button
                          type="button"
                          key={c.id}
                          className={`source-chip ${filterCollectionId === c.id ? 'active' : ''}`}
                          onClick={() => setAndPersistCollectionId(filterCollectionId === c.id ? null : c.id!)}
                        >
                          {c.icon ? `${c.icon} ${c.name}` : c.name}
                          {due > 0 && <span className="source-chip-count">{due}</span>}
                        </button>
                      )
                    })}
                </div>
              </div>
            )}

            <div className="review-filter-section">
              <span className="review-filter-label">Estado</span>
              <div className="review-filter-toggle">
                {(
                  [
                    ['all', 'Todos'],
                    ['new', 'Novos'],
                    ['learning', 'Aprendendo'],
                    ['review', 'Revisando'],
                  ] as [CardStateFilter, string][]
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`filter-toggle-btn ${filterCardState === val ? 'active' : ''}`}
                    onClick={() => setFilterCardState(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="review-filter-section">
              <span className="review-filter-label">Limite por sessão</span>
              <div className="review-filter-toggle">
                {LIMIT_OPTIONS.map((limit) => (
                  <button
                    key={limit}
                    type="button"
                    className={`filter-toggle-btn ${sessionLimit === limit ? 'active' : ''}`}
                    onClick={() => setAndPersistLimit(limit)}
                  >
                    {limit}
                  </button>
                ))}
                <button
                  type="button"
                  className={`filter-toggle-btn ${sessionLimit === null ? 'active' : ''}`}
                  onClick={() => setAndPersistLimit(null)}
                >
                  Todos
                </button>
              </div>
            </div>
          </>
        )}

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

        {practiceMode === 'fill-blank' && (
          <label className="review-sub-toggle">
            <input
              type="checkbox"
              checked={progressiveBlanks}
              onChange={(e) => {
                setProgressiveBlanks(e.target.checked)
                localStorage.setItem('review_fill_blank_progressive', e.target.checked ? '1' : '0')
              }}
            />
            <span>Palavra por palavra</span>
            <span className="review-sub-toggle-hint">Toque em cada lacuna para revelar uma palavra por vez</span>
          </label>
        )}

        {totalAll === 0 ? (
          <>
            <button type="button" className="btn btn-primary btn-large btn-start" disabled>
              Adicione textos para começar
            </button>
            <p className="queue-empty-hint">
              Vá para <a href="/browse">Textos</a> para adicionar itens.
            </p>
          </>
        ) : filteredProgress.length === 0 && noFiltersActive ? (
          <div className="queue-up-to-date">
            <p className="queue-up-to-date-msg">Você está em dia!</p>
            <p className="queue-up-to-date-hint">Volte amanhã para a próxima revisão.</p>
          </div>
        ) : filteredProgress.length === 0 ? (
          <div className="queue-up-to-date">
            <p className="queue-up-to-date-msg">Sem resultados</p>
            <p className="queue-up-to-date-hint">Nenhum texto encontrado com esses filtros.</p>
          </div>
        ) : (
          <button type="button" className="btn btn-primary btn-large btn-start" onClick={startReview}>
            Iniciar Revisão
          </button>
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
        skippedCount={skipped}
        gradeHistory={gradeHistory}
        lastVerse={
          items.length > 0
            ? {
                ref: items[items.length - 1].reference,
                text: items[items.length - 1].verseText,
                translation: items[items.length - 1].translation,
              }
            : undefined
        }
        remainingCount={Math.max(0, filteredProgress.length - sessionOffsetRef.current - items.length)}
        onGoBack={goBack}
        onNewSession={() => {
          setCurrentIndex(0)
          setCompleted(0)
          setSkipped(0)
          setGradeHistory([])
        }}
        onContinue={() => {
          sessionOffsetRef.current += items.length
          startReview()
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
          {completed} <Check size={12} aria-hidden />
        </span>
      </div>
      <div className="review-progress-bar">
        <div className="review-progress-fill" style={{ width: `${(currentIndex / items.length) * 100}%` }} />
      </div>
      <div className="review-skip-row">
        <button type="button" className="btn-skip" onClick={handleSkip} aria-label="Pular versículo">
          Pular →
        </button>
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
          progressive={progressiveBlanks}
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
