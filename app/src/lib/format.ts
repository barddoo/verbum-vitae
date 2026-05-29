import { BOOKS } from 'shared/bible'
import { parseVerseKey } from './db'

export function verseIdToReference(verseId: string): string {
  const { bookNumber, chapter, verseStart, verseEnd } = parseVerseKey(verseId)
  const bookName = BOOKS[bookNumber]
  if (!bookName) return verseId
  const ref = `${bookName} ${chapter}:${verseStart}`
  return verseEnd ? `${ref}-${verseEnd}` : ref
}

export function formatRelativeDueDate(dueDate: number): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)

  if (diffDays < 0) {
    if (diffDays === -1) return 'Venceu ontem'
    return `Venceu há ${Math.abs(diffDays)} dias`
  }
  if (diffDays === 0) return 'Vence hoje'
  if (diffDays === 1) return 'Vence amanhã'
  return `Vence em ${diffDays} dias`
}
