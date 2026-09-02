import { fsrs, Rating, type ReviewLog } from 'ts-fsrs'
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

export interface ScheduledGrade {
  card: Card
  log: ReviewLog
  dueDate: number
  state: number
}

/**
 * All four candidate schedules for the next review of `card`, keyed by grade (1 Again,
 * 2 Hard, 3 Good, 4 Easy). `scheduler.repeat` applies the same learning steps and fuzz the
 * single-grade path does, so the interval shown on a grade button is the interval that grade
 * will actually write — the app never has to guess what "3" means.
 */
export function previewGrades(card: Card, now: Date = new Date()): Record<Grade, ScheduledGrade> {
  const preview = scheduler.repeat(card, now)
  const out = {} as Record<Grade, ScheduledGrade>
  for (const g of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]) {
    const { card: next, log } = preview[g]
    out[g] = { card: next, log, dueDate: next.due.getTime(), state: stateFromCard(next) }
  }
  return out
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "10min", "3h", "5d" — what the user actually sees on the grade buttons. */
export function formatInterval(dueDate: number, now: number = Date.now()): string {
  const delta = dueDate - now
  if (delta <= 0) return 'agora'
  const minutes = Math.round(delta / MINUTE)
  if (minutes < 90) return `${minutes}min`
  const hours = Math.round(delta / HOUR)
  if (hours < 24) return `${hours}h`
  const days = Math.round(delta / DAY)
  return `${days}d`
}
