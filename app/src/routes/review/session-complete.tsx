import { useMemo } from 'react'
import { shareVerse } from '../../lib/sharing'
import type { Grade } from '../../lib/srs'

interface DueItem {
  progressId: number
  verseId: string
  reference: string
  verseText: string
  card: unknown
  translation: string
}

export function SessionComplete({
  completed,
  skippedCount,
  gradeHistory,
  reviewedItems,
  remainingCount,
  onGoBack,
  onNewSession,
  onContinue,
}: {
  completed: number
  skippedCount: number
  gradeHistory: Grade[]
  reviewedItems: DueItem[]
  remainingCount: number
  onGoBack: () => void
  onNewSession: () => void
  onContinue: () => void
}) {
  const gradeCounts = useMemo(() => [1, 2, 3, 4].map((r) => gradeHistory.filter((g) => g === r).length), [gradeHistory])

  const lastItem = reviewedItems.length > 0 ? reviewedItems[reviewedItems.length - 1] : null

  function handleShare() {
    shareVerse({
      verseRef: lastItem?.reference,
      verseText: lastItem?.verseText,
    })
  }

  return (
    <div className="page review-page">
      <div className="session-complete">
        <h2>Sessão concluída!</h2>
        <p className="session-complete-count">
          {completed} {completed === 1 ? 'texto revisado' : 'textos revisados'}
          {skippedCount > 0 && (
            <span className="session-skipped-count">
              {' '}
              · {skippedCount} pulado{skippedCount !== 1 ? 's' : ''}
            </span>
          )}
        </p>
        {completed > 0 && (
          <div className="session-grade-breakdown">
            {[1, 2, 3, 4].map((r, i) => (
              <div key={r} className={`grade-breakdown-item grade-breakdown-${r}`}>
                <span>{['', 'Esqueci', 'Difícil', 'Ok', 'Fácil'][r]}</span>
                <span>{gradeCounts[i]}</span>
              </div>
            ))}
          </div>
        )}
        <div className="session-complete-actions">
          {remainingCount > 0 ? (
            <button type="button" className="btn btn-primary" onClick={onContinue}>
              Próxima sessão ({remainingCount})
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onNewSession}>
              Nova Sessão
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onGoBack}>
            Voltar
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleShare}>
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  )
}
