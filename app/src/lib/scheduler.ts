import { fsrs, Rating } from 'ts-fsrs'
import type { Card, Grade } from './srs'
import { stateFromCard } from './srs'

export { Rating }

const scheduler = fsrs()

export function getNextCard(card: Card, rating: Grade, now: Date = new Date()) {
  const result = scheduler.next(card, now, rating)
  return {
    card: result.card,
    log: result.log,
    dueDate: result.card.due.getTime(),
    state: stateFromCard(result.card),
  }
}
