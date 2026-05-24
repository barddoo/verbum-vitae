import type { Card, Grade, ReviewLog } from 'ts-fsrs'

export type { Card, Grade, ReviewLog }

export function createEmptyCard(now: Date = new Date()): Card {
  return {
    due: now,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    last_review: undefined,
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
    } catch {
      /* skip */
    }
  }

  return due.sort((a, b) => a.card.due.getTime() - b.card.due.getTime())
}

export function stateFromCard(card: Card): number {
  switch (card.state) {
    case 1:
      return 1
    case 2:
      return 2
    case 3:
      return 3
    default:
      return 0
  }
}

export function isLearningOrRelearning(card: Card): boolean {
  return card.state === 1 || card.state === 3
}
