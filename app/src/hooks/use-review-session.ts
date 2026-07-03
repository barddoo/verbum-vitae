import { useCallback, useEffect, useRef, useState } from 'react'
import { db, fetchVersesBatch, type Progress, parseTextKey } from '../lib/db'
import { verseIdToReference } from '../lib/format'
import { getNextCard } from '../lib/scheduler'
import { type Card, type Grade, getDueCards } from '../lib/srs'
import { logProgressChange } from '../lib/sync'

export interface DueItem {
  progressId: number
  verseId: string
  reference: string
  verseText: string
  card: Card
  translation: string
  isQA: boolean
  question?: string
}

interface ReviewSessionInput {
  allProgress: Progress[] | undefined
  filteredProgress: Progress[]
  sessionLimit: number | null
  setPhase: (p: 'queue' | 'session') => void
}

export function useReviewSession({ allProgress, filteredProgress, sessionLimit, setPhase }: ReviewSessionInput) {
  const [items, setItems] = useState<DueItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [gradeHistory, setGradeHistory] = useState<Grade[]>([])
  const [skipped, setSkipped] = useState(0)
  const sessionOffsetRef = useRef(0)

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
  }, [allProgress, filteredProgress, sessionLimit, setPhase])

  useEffect(() => {
    sessionOffsetRef.current = 0
  }, [filteredProgress])

  async function handleGrade(rating: Grade) {
    const item = items[currentIndex]
    if (!item) return
    const { card, dueDate, state } = getNextCard(item.card, rating)
    const streak = rating > 1 ? item.card.reps + 1 : 0
    await db.progress.update(item.progressId, { cardJson: JSON.stringify(card), dueDate, state, streak, updatedAt: Date.now() })
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
        streak,
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

  function resetSessionStats() {
    setCurrentIndex(0)
    setCompleted(0)
    setSkipped(0)
    setGradeHistory([])
  }

  return {
    items,
    currentIndex,
    completed,
    sessionLoading,
    gradeHistory,
    skipped,
    sessionOffsetRef,
    startReview,
    handleGrade,
    handleSkip,
    goBack,
    resetSessionStats,
  }
}
