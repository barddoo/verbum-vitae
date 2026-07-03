import type { CollectionVerse, Progress } from './db'
import { getDueCards, parseCardJson } from './srs'

export function computeProgressVerseIds(allProgress: Progress[] | undefined): Set<string> {
  if (!allProgress) return new Set()
  return new Set(allProgress.map((p) => p.verseId))
}

export function computeDueVerseIds(allProgress: Progress[] | undefined): Set<string> {
  if (!allProgress) return new Set()
  return new Set(getDueCards(allProgress).map((d) => d.verseId))
}

export function computeCollectionProgress(
  allCollectionVerses: CollectionVerse[] | undefined,
  progressVerseIds: Set<string>,
  dueVerseIds: Set<string>,
): Map<number, { total: number; due: number }> {
  if (!allCollectionVerses) return new Map()
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
}

export function computeFilteredProgress(
  allProgress: Progress[] | undefined,
  filterVerseIds: string[] | null,
  filterStatus: string,
  filterCollectionId: number | null,
  collectionVerseIds: CollectionVerse[] | null | undefined,
  filterCardState: string,
): Progress[] {
  if (!allProgress) return []

  if (filterVerseIds !== null) {
    const idSet = new Set(filterVerseIds)
    return allProgress.filter((p) => idSet.has(p.verseId))
  }

  let base: Progress[]
  if (filterStatus === 'due') {
    const dueCards = getDueCards(allProgress)
    const dueSet = new Set(dueCards.map((d) => d.verseId))
    base = allProgress.filter((p) => dueSet.has(p.verseId))
  } else {
    base = allProgress
  }

  if (filterCollectionId !== null) {
    if (!collectionVerseIds) return []
    const cvOrderMap = new Map(collectionVerseIds.map((cv, i) => [cv.verseId, i]))
    base = base.filter((p) => cvOrderMap.has(p.verseId))
    base = [...base].sort((a, b) => (cvOrderMap.get(a.verseId) ?? 0) - (cvOrderMap.get(b.verseId) ?? 0))
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
}
