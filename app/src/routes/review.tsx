import { ImpactStyle, NotificationType } from '@capacitor/haptics'
import { useSearch } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CollectionVerse, Progress } from '../lib/db'
import { db, fetchVersesBatch, parseTextKey, recordReview, recordSkip, reviewLogRowId } from '../lib/db'
import { verseIdToReference } from '../lib/format'
import { hapticImpact, hapticNotify } from '../lib/haptics'
import { formatInterval, getNextCard, previewGrades, Rating, type ScheduledGrade } from '../lib/scheduler'
import type { Card, Grade } from '../lib/srs'
import { getDueCards, parseCardJson } from '../lib/srs'
import { logProgressChange } from '../lib/sync'
import { ReviewQueue } from './review/review-queue'
import { ReviewSession } from './review/review-session'
import type { CardStateFilter, PracticeMode, ReviewItem } from './review/review-types'
import { SessionComplete } from './review/session-complete'

type DueItem = ReviewItem & { card: Card }

const GRADES = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]

/** Most overdue first. `dueDate` mirrors `cardJson`'s due and is written on every create and grade. */
const byDueDate = (a: Progress, b: Progress) => a.dueDate - b.dueDate

/** What one grade press must be able to roll back: the previous row plus the rows it wrote. */
interface GradeSnapshot {
  index: number
  verseId: string
  translation: string
  rating: Grade
  prev: { cardJson: string; dueDate: number; state: number; streak: number; lastReview?: number; updatedAt: number }
  reviewLocalId?: number
  reviewSyncId?: number
  progressSyncId?: number
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
  const [shuffle, setShuffle] = useState(() => localStorage.getItem('review_shuffle') === '1')
  const [gradeHistory, setGradeHistory] = useState<Grade[]>([])
  const [skipped, setSkipped] = useState(0)
  const [sessionSkipMap, setSessionSkipMap] = useState<Map<string, number>>(new Map())
  const [undoStack, setUndoStack] = useState<GradeSnapshot[]>([])
  const [filterVerseIds, setFilterVerseIds] = useState<string[] | null>(() => {
    // Read only here — clearing happens in an effect below. StrictMode double-invokes this
    // initializer in dev; removing the key inside it makes the second call see null and the
    // pinned selection vanishes.
    const saved = localStorage.getItem('review_verse_selection')
    return saved ? (JSON.parse(saved) as string[]) : null
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

  // Pinned verse selection is consumed by navigating into /review; the read above is race-free
  // with StrictMode's double-invoked initializer, so the actual clear lives here.
  useEffect(() => {
    localStorage.removeItem('review_verse_selection')
  }, [])

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
      return allProgress.filter((p) => idSet.has(p.verseId)).sort(byDueDate)
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

    // `startReview` slices this list to honour the session limit, so the order here decides which
    // verses a capped session gets. Dexie hands rows back in id order, which would pin every
    // capped session to the same earliest-added verses and never surface the most overdue ones.
    return [...base].sort(byDueDate)
  }, [allProgress, filterVerseIds, filterStatus, filterCollectionId, collectionVerseIds, filterCardState])

  const reviewCount = sessionLimit ? Math.min(filteredProgress.length, sessionLimit) : filteredProgress.length

  function setAndPersistMode(m: PracticeMode) {
    setPracticeMode(m)
    localStorage.setItem('review_mode', m)
  }

  function toggleShuffle() {
    setShuffle((s) => {
      const next = !s
      localStorage.setItem('review_shuffle', next ? '1' : '0')
      return next
    })
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
    let selected = filteredProgress.slice(sessionOffsetRef.current, end)

    // Item 10 — serial-position cues: when shuffling, randomize *presentation* order inside the
    // session while the slice still honours due-first ordering, so the most overdue verses are
    // never skipped by a cap just because the deck was shuffled.
    if (shuffle) {
      selected = [...selected]
      for (let i = selected.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[selected[i], selected[j]] = [selected[j], selected[i]]
      }
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
    setSkipped(0)
    setSessionSkipMap(new Map())
    setUndoStack([])
    setGradeHistory([])
    setPhase('session')
    setSessionLoading(false)
  }, [allProgress, filteredProgress, sessionLimit, shuffle])

  useEffect(() => {
    sessionOffsetRef.current = 0
  }, [filteredProgress])

  useEffect(() => {
    if (!loading && autostart === '1' && totalAll > 0 && phase === 'queue' && !autostartFired.current) {
      autostartFired.current = true
      startReview()
    }
  }, [loading, autostart, totalAll, phase, startReview])

  const activePreview = useMemo<Record<Grade, ScheduledGrade> | null>(() => {
    const item = items[currentIndex]
    if (!item) return null
    return previewGrades(item.card)
  }, [items, currentIndex])

  const activeIntervals = useMemo<Partial<Record<Grade, string>>>(() => {
    if (!activePreview) return {}
    const now = Date.now()
    const out: Partial<Record<Grade, string>> = {}
    for (const g of GRADES) out[g] = formatInterval(activePreview[g].dueDate, now)
    return out
  }, [activePreview])

  function progressSyncData(
    verseId: string,
    translation: string,
    cardJson: string,
    state: number,
    dueDate: number,
    streak: number,
    lastReview: number | null,
  ) {
    return JSON.stringify({
      verseId,
      translation,
      cardJson,
      state,
      dueDate,
      streak,
      nextReview: new Date(dueDate).toISOString(),
      lastReview: lastReview ? new Date(lastReview).toISOString() : null,
    })
  }

  async function handleGrade(rating: Grade) {
    const item = items[currentIndex]
    if (!item) return
    const scheduled = activePreview?.[rating]
    const { card, dueDate, state, log } = scheduled ?? getNextCard(item.card, rating)
    const reviewedAt = Date.now()

    const reviewEntry = {
      verseId: item.verseId,
      translation: item.translation,
      reviewedAt,
      rating: rating as number,
      // `log.state` is the state the card was in *before* this grade, which is what an
      // optimizer needs; `state` below is where the grade moved it to.
      state: log.state,
      scheduledDays: card.scheduled_days,
    }
    const reviewLocalId = await recordReview(reviewEntry)
    const reviewSyncId = await logProgressChange({
      tableName: 'reviewLog',
      rowId: reviewLogRowId(reviewEntry),
      operation: 'create',
      data: JSON.stringify({ ...reviewEntry, reviewedAt: new Date(reviewedAt).toISOString() }),
    })

    // Snapshot before overwriting so a misgrade can be undone in one step.
    const prev = await db.progress.get(item.progressId)
    const nextFields = {
      cardJson: JSON.stringify(card),
      dueDate,
      state,
      streak: rating > 1 ? item.card.reps + 1 : 0,
      lastReview: reviewedAt,
      updatedAt: reviewedAt,
    }
    await db.progress.update(item.progressId, nextFields)

    const progressSyncId = await logProgressChange({
      tableName: 'progress',
      rowId: item.verseId,
      operation: 'update',
      data: progressSyncData(item.verseId, item.translation, nextFields.cardJson, state, dueDate, nextFields.streak, reviewedAt),
    })

    if (prev) {
      setUndoStack((stack) => [
        ...stack,
        {
          index: currentIndex,
          verseId: item.verseId,
          translation: item.translation,
          rating,
          prev: {
            cardJson: prev.cardJson,
            dueDate: prev.dueDate,
            state: prev.state,
            streak: prev.streak,
            lastReview: prev.lastReview,
            updatedAt: prev.updatedAt,
          },
          reviewLocalId,
          reviewSyncId,
          progressSyncId,
        },
      ])
    }

    if (rating === (Rating.Again as Grade)) hapticNotify(NotificationType.Error)
    else hapticImpact(rating >= (Rating.Good as Grade) ? ImpactStyle.Medium : ImpactStyle.Light)

    setCompleted((c) => c + 1)
    setGradeHistory((h) => [...h, rating])
    setTimeout(() => setCurrentIndex((i) => i + 1), 100)
  }

  async function handleUndo() {
    const snapshot = undoStack[undoStack.length - 1]
    if (!snapshot) return
    setUndoStack((stack) => stack.slice(0, -1))

    if (snapshot.reviewLocalId != null) await db.reviewLog.delete(snapshot.reviewLocalId)
    if (snapshot.reviewSyncId != null) await db.syncLog.delete(snapshot.reviewSyncId)
    if (snapshot.progressSyncId != null) await db.syncLog.delete(snapshot.progressSyncId)

    // Restore the row and requeue a progress sync entry so the next push converges the server
    // back to the pre-grade state (removing the stale local entry is not enough if it already
    // reached the server).
    await db.progress.where({ verseId: snapshot.verseId, translation: snapshot.translation }).modify(snapshot.prev)
    await logProgressChange({
      tableName: 'progress',
      rowId: snapshot.verseId,
      operation: 'update',
      data: progressSyncData(
        snapshot.verseId,
        snapshot.translation,
        snapshot.prev.cardJson,
        snapshot.prev.state,
        snapshot.prev.dueDate,
        snapshot.prev.streak,
        snapshot.prev.lastReview ?? null,
      ),
    })

    setCurrentIndex(snapshot.index)
    setCompleted((c) => Math.max(0, c - 1))
    setGradeHistory((h) => h.slice(0, -1))
  }

  function handleSkip() {
    const item = items[currentIndex]
    if (!item) return
    setSkipped((s) => s + 1)
    setSessionSkipMap((m) => {
      const next = new Map(m)
      next.set(item.verseId, (next.get(item.verseId) ?? 0) + 1)
      return next
    })
    void recordSkip({ verseId: item.verseId, translation: item.translation, skippedAt: Date.now() })
    setTimeout(() => setCurrentIndex((i) => i + 1), 100)
  }

  function goBack() {
    setPhase('queue')
    setItems([])
    setCurrentIndex(0)
    setCompleted(0)
    setSkipped(0)
    setSessionSkipMap(new Map())
    setUndoStack([])
    setGradeHistory([])
    sessionOffsetRef.current = 0
  }

  if (loading || sessionLoading) return <div className="page">{loadingSpinner}</div>

  if (phase === 'queue') {
    const noFiltersActive = filterVerseIds === null && filterCollectionId === null && filterCardState === 'all'
    const hasCollections = collections ? collections.length > 0 : false
    const showTotalHint = filterStatus === 'due' && noFiltersActive && totalAll > totalDue && totalAll > 0

    return (
      <ReviewQueue
        reviewCount={reviewCount}
        totalAll={totalAll}
        filterStatus={filterStatus}
        noFiltersActive={noFiltersActive}
        showTotalHint={showTotalHint}
        filteredProgressLength={filteredProgress.length}
        filterVerseIds={filterVerseIds}
        hasCollections={hasCollections}
        collections={collections ?? []}
        collectionProgress={collectionProgress}
        filterCollectionId={filterCollectionId}
        filterCardState={filterCardState}
        sessionLimit={sessionLimit}
        shuffle={shuffle}
        practiceMode={practiceMode}
        progressive={progressiveBlanks}
        onClearPinned={() => setFilterVerseIds(null)}
        onCollectionChange={(id) => {
          setFilterCollectionId(id)
          if (id !== null) localStorage.setItem('review_collection_id', String(id))
          else localStorage.removeItem('review_collection_id')
        }}
        onStateChange={setFilterCardState}
        onLimitChange={(limit) => {
          setSessionLimit(limit)
          if (limit !== null) localStorage.setItem('review_session_limit', String(limit))
          else localStorage.removeItem('review_session_limit')
        }}
        onShuffleChange={toggleShuffle}
        onModeChange={setAndPersistMode}
        onProgressiveChange={(checked) => {
          setProgressiveBlanks(checked)
          localStorage.setItem('review_fill_blank_progressive', checked ? '1' : '0')
        }}
        onStart={() => {
          void startReview()
        }}
      />
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
          setSessionSkipMap(new Map())
          setGradeHistory([])
          setUndoStack([])
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
    <ReviewSession
      itemsLength={items.length}
      currentIndex={currentIndex}
      item={currentItem}
      completed={completed}
      practiceMode={practiceMode}
      progressive={progressiveBlanks}
      intervals={activeIntervals}
      skippedInSession={sessionSkipMap.get(currentItem.verseId) ?? 0}
      canUndo={undoStack.length > 0}
      onBack={goBack}
      onUndo={() => {
        void handleUndo()
      }}
      onSkip={handleSkip}
      onGrade={(r) => {
        void handleGrade(r)
      }}
      onModeChange={setAndPersistMode}
    />
  )
}
