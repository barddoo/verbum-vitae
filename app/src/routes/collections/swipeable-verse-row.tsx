import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Check, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useSwipeToDelete } from '../../hooks/use-swipe'
import { removeVerseFromCollection } from '../../lib/db'

export function SwipeableVerseRow({
  verseId,
  reference,
  text,
  memorized,
  collectionId,
  translation,
  onRemoved,
}: {
  verseId: string
  reference: string
  text: string
  memorized: boolean
  collectionId: number
  translation: string
  onRemoved: (verseId: string, translation: string, wasMemoized: boolean) => void
}) {
  const [removing, setRemoving] = useState(false)

  const handleDelete = useCallback(async () => {
    setRemoving(true)
    await removeVerseFromCollection(collectionId, verseId, translation)
    onRemoved(verseId, translation, memorized)
  }, [collectionId, verseId, translation, memorized, onRemoved])

  const swipe = useSwipeToDelete(handleDelete)

  if (removing) return null

  return (
    <div className="swipe-container">
      <div className="swipe-action">
        <Trans>Remover</Trans>
      </div>
      <div
        className={`swipe-content collection-verse-row ${memorized ? 'memorized' : ''}`}
        style={{ transform: `translateX(${swipe.translateX}px)`, transition: swipe.translateX === 0 ? 'transform 0.2s ease' : 'none' }}
        onPointerDown={swipe.handlePointerDown}
        onPointerMove={swipe.handlePointerMove}
        onPointerUp={swipe.handlePointerUp}
        onPointerCancel={swipe.handlePointerCancel}
      >
        <span className="collection-verse-ref">{reference}</span>
        <span className="collection-verse-text">{text}</span>
        {memorized && (
          <span className="memorized-badge">
            <Check size={10} aria-hidden /> <Trans>Memorizado</Trans>
          </span>
        )}
        <button
          type="button"
          className="verse-remove-btn"
          aria-label={t`Remover ${reference}`}
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  )
}
