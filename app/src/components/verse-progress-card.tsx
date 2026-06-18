import { Check } from 'lucide-react'
import { memo, useState } from 'react'
import { formatRelativeDueDate, verseIdToReference } from '../lib/format'

interface VerseProgressCardProps {
  verseId: string
  text: string
  state: number
  dueDate: number
  streak: number
  onRemove: (verseId: string) => void
  selected?: boolean
  onSelect?: (verseId: string) => void
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
  selected,
  onSelect,
}: VerseProgressCardProps) {
  const [confirming, setConfirming] = useState(false)
  const reference = verseIdToReference(verseId)
  const dueLabel = formatRelativeDueDate(dueDate)
  const stateLabel = STATE_LABELS[state] || 'Novo'
  const stateClass = STATE_CLASSES[state] || STATE_CLASSES[0]
  const selectionMode = onSelect !== undefined

  return (
    <div
      className={`verse-card${selectionMode ? ' verse-card--selectable' : ''}${selected ? ' verse-card--selected' : ''}`}
      onClick={selectionMode ? () => onSelect(verseId) : undefined}
      tabIndex={selectionMode ? 0 : undefined}
      onKeyDown={
        selectionMode
          ? (e) => {
              if (e.key === ' ' || e.key === 'Enter') onSelect(verseId)
            }
          : undefined
      }
    >
      <div className="verse-card-header">
        <span className="verse-card-ref">{reference}</span>
        {selectionMode ? (
          <span className={`verse-card-check${selected ? ' checked' : ''}`} aria-hidden="true">
            {selected ? <Check size={12} /> : ''}
          </span>
        ) : !confirming ? (
          <button
            type="button"
            className="verse-card-remove"
            onClick={(e) => {
              e.stopPropagation()
              setConfirming(true)
            }}
            aria-label={`Remover ${reference}`}
          >
            ×
          </button>
        ) : (
          <div className="verse-card-confirm">
            <span className="verse-card-confirm-text">Remover?</span>
            <button
              type="button"
              className="verse-card-confirm-yes"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(verseId)
              }}
            >
              Sim
            </button>
            <button
              type="button"
              className="verse-card-confirm-no"
              onClick={(e) => {
                e.stopPropagation()
                setConfirming(false)
              }}
            >
              Não
            </button>
          </div>
        )}
      </div>
      <div className="verse-card-text">{text}</div>
      <div className="verse-card-meta">
        <span className={`state-badge ${stateClass}`}>{stateLabel}</span>
        <span className="verse-card-due">{dueLabel}</span>
        {streak > 0 && (
          <span className="verse-card-streak" title="Respostas corretas seguidas">
            {streak}&#x1F525;
          </span>
        )}
      </div>
    </div>
  )
})
