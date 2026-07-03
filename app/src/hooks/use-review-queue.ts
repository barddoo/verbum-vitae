import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { type CollectionVerse, db } from '../lib/db'
import { computeCollectionProgress, computeDueVerseIds, computeFilteredProgress, computeProgressVerseIds } from '../lib/review-queue-utils'
import { getDueCards } from '../lib/srs'

export type PracticeMode = 'flashcard' | 'fill-blank' | 'typing'
export type CardStateFilter = 'all' | 'new' | 'learning' | 'review'

export function useReviewQueue() {
  const [phase, setPhase] = useState<'queue' | 'session'>('queue')
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(
    () => (localStorage.getItem('review_mode') as PracticeMode) || 'fill-blank',
  )
  const [progressiveBlanks, setProgressiveBlanks] = useState(() => localStorage.getItem('review_fill_blank_progressive') === '1')
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

  const allProgress = useLiveQuery(() => db.progress.toArray(), [])
  const collections = useLiveQuery(() => db.collections.toArray(), [])
  const allCollectionVerses = useLiveQuery(() => db.collectionVerses.toArray(), [])
  const collectionVerseIds = useLiveQuery<CollectionVerse[] | null>(
    () =>
      filterCollectionId != null
        ? db.collectionVerses.where({ collectionId: filterCollectionId }).sortBy('sortOrder')
        : Promise.resolve(null),
    [filterCollectionId],
  )

  const progressVerseIds = useMemo(() => computeProgressVerseIds(allProgress), [allProgress])
  const dueVerseIds = useMemo(() => computeDueVerseIds(allProgress), [allProgress])
  const collectionProgress = useMemo(
    () => computeCollectionProgress(allCollectionVerses, progressVerseIds, dueVerseIds),
    [allCollectionVerses, progressVerseIds, dueVerseIds],
  )

  const totalAll = allProgress?.length ?? 0
  const totalDue = allProgress ? getDueCards(allProgress).length : 0
  const loading = allProgress === undefined
  const filterStatus = totalDue > 0 ? 'due' : 'all'

  const filteredProgress = useMemo(
    () => computeFilteredProgress(allProgress, filterVerseIds, filterStatus, filterCollectionId, collectionVerseIds, filterCardState),
    [allProgress, filterVerseIds, filterStatus, filterCollectionId, collectionVerseIds, filterCardState],
  )

  function setAndPersistMode(m: PracticeMode) {
    setPracticeMode(m)
    localStorage.setItem('review_mode', m)
  }
  function setAndPersistLimit(limit: number | null) {
    setSessionLimit(limit)
    if (limit !== null) localStorage.setItem('review_session_limit', String(limit))
    else localStorage.removeItem('review_session_limit')
  }
  function setAndPersistCollectionId(id: number | null) {
    setFilterCollectionId(id)
    if (id !== null) localStorage.setItem('review_collection_id', String(id))
    else localStorage.removeItem('review_collection_id')
  }

  useEffect(() => {
    if (filterCollectionId !== null && collections && !collections.some((c) => c.id === filterCollectionId)) {
      setFilterCollectionId(null)
      localStorage.removeItem('review_collection_id')
    }
  }, [collections, filterCollectionId])

  return {
    phase,
    setPhase,
    practiceMode,
    setAndPersistMode,
    progressiveBlanks,
    setProgressiveBlanks,
    filterVerseIds,
    setFilterVerseIds,
    filterCollectionId,
    setAndPersistCollectionId,
    filterCardState,
    setFilterCardState,
    sessionLimit,
    setAndPersistLimit,
    allProgress,
    collections,
    allCollectionVerses,
    collectionVerseIds,
    progressVerseIds,
    dueVerseIds,
    collectionProgress,
    totalAll,
    totalDue,
    loading,
    filterStatus,
    filteredProgress,
  }
}
