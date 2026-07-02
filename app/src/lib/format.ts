import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { getBooks } from 'shared/bible'
import { SOURCE_LABELS } from 'shared/texts'
import { parseTextKey } from './db'

export function verseIdToReference(verseId: string): string {
  const p = parseTextKey(verseId)

  if (p.sourceType === 'bible') {
    const books = getBooks(i18n.locale)
    const bookName = books[p.sectionIndex]
    if (!bookName) return verseId
    const ref = `${bookName} ${p.blockIndex}:${p.itemIndex}`
    return p.itemEnd ? `${ref}-${p.itemEnd}` : ref
  }

  const meta = SOURCE_LABELS[`${p.sourceType}:${p.sourceId}`]
  const name = meta?.name || p.sourceId
  const label = meta?.itemLabel || 'Item'
  const num = p.blockIndex + 1

  return `${name} — ${label} ${num}`
}

export function formatRelativeDueDate(dueDate: number): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)

  if (diffDays < 0) {
    if (diffDays === -1) return t`Venceu ontem`
    return t`Venceu há ${Math.abs(diffDays)} dias`
  }
  if (diffDays === 0) return t`Vence hoje`
  if (diffDays === 1) return t`Vence amanhã`
  return t`Vence em ${diffDays} dias`
}
