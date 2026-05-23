import { type Card, createEmptyCard, fsrs, type Grade, Rating, type ReviewLog } from 'ts-fsrs'

export type { Card, Grade, ReviewLog }
export { createEmptyCard, Rating }

export const scheduler = fsrs()

export function getNextCard(card: Card, rating: Grade, now: Date = new Date()) {
  const result = scheduler.next(card, now, rating)
  return {
    card: result.card,
    log: result.log,
    dueDate: result.card.due.getTime(),
    state: stateFromCard(result.card),
  }
}

export function parseCardJson(json: string): Card {
  const card = JSON.parse(json) as Card
  if (typeof card.due === 'string') card.due = new Date(card.due)
  if (card.last_review && typeof card.last_review === 'string') card.last_review = new Date(card.last_review)
  return card
}

export function getDueCards(progressList: { verseId: string; cardJson: string }[], now: Date = new Date()) {
  const due: { verseId: string; card: Card }[] = []
  const nowTs = now.getTime()

  for (const p of progressList) {
    try {
      const card = parseCardJson(p.cardJson)
      if (card.due.getTime() <= nowTs) {
        due.push({ verseId: p.verseId, card })
      }
    } catch { /* skip */ }
  }

  return due.sort((a, b) => a.card.due.getTime() - b.card.due.getTime())
}

export function stateFromCard(card: Card): number {
  switch (card.state) {
    case 1:
      return 1 // Learning
    case 2:
      return 2 // Review
    case 3:
      return 3 // Relearning
    default:
      return 0 // New
  }
}

export function isLearningOrRelearning(card: Card): boolean {
  return card.state === 1 || card.state === 3
}
