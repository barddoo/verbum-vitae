import { fsrs, Rating } from 'ts-fsrs'
import type { Card, Grade } from './srs'
import { stateFromCard } from './srs'

export { Rating }

// Fuzz jitters each interval by a small random amount. Without it, a collection added in one
// tap (every card due at the same instant) advances in lockstep forever — a 50-verse
// collection stays a recurring 50-verse wall. ts-fsrs defaults this to false.
const scheduler = fsrs({ enable_fuzz: true })

export function getNextCard(card: Card, rating: Grade, now: Date = new Date()) {
  const result = scheduler.next(card, now, rating)
  return {
    card: result.card,
    log: result.log,
    dueDate: result.card.due.getTime(),
    state: stateFromCard(result.card),
  }
}
