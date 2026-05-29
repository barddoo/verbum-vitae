import { memo, useState } from 'react'
import { formatRelativeDueDate, verseIdToReference } from '../lib/format'

interface VerseProgressCardProps {
  verseId: string
  text: string
  state: number
  dueDate: number
  streak: number
  onRemove: (verseId: string) => void
}

const STATE_LABELS = ['Novo', 'Aprendendo', 'Revisando', 'Reaprendendo']
const STATE_CLASSES = ['state-new', 'state-learning', 'state-review', 'state-relearning']

export const VerseProgressCard = memo(function VerseProgressCard({
  verseId,
  text,
  state,
  dueDate,
  streak,
  onRemove,
}: VerseProgressCardProps) {
  const [confirming, setConfirming] = useState(false)
  const reference = verseIdToReference(verseId)
  const dueLabel = formatRelativeDueDate(dueDate)
  const stateLabel = STATE_LABELS[state] || 'Novo'
  const stateClass = STATE_CLASSES[state] || STATE_CLASSES[0]

  return (
    <div className="verse-card">
      <div className="verse-card-header">
        <span className="verse-card-ref">{reference}</span>
        {!confirming ? (
          <button type="button" className="verse-card-remove" onClick={() => setConfirming(true)} aria-label={`Remover ${reference}`}>
            ×
          </button>
        ) : (
          <div className="verse-card-confirm">
            <span className="verse-card-confirm-text">Remover?</span>
            <button type="button" className="verse-card-confirm-yes" onClick={() => onRemove(verseId)}>
              Sim
            </button>
            <button type="button" className="verse-card-confirm-no" onClick={() => setConfirming(false)}>
              Não
            </button>
          </div>
        )}
      </div>
      <div className="verse-card-text">{text}</div>
      <div className="verse-card-meta">
        <span className={`state-badge ${stateClass}`}>{stateLabel}</span>
        <span className="verse-card-due">{dueLabel}</span>
        {streak > 0 && <span className="verse-card-streak">{streak}&#x1F525;</span>}
      </div>
    </div>
  )
})
