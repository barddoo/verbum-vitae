import { useMemo } from 'react'
import { buildWhatsAppInvite } from '../../lib/sharing'
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
  gradeHistory,
  reviewedItems,
  onGoBack,
  onNewSession,
}: {
  completed: number
  gradeHistory: Grade[]
  reviewedItems: DueItem[]
  onGoBack: () => void
  onNewSession: () => void
}) {
  const gradeCounts = useMemo(() => [1, 2, 3, 4].map((r) => gradeHistory.filter((g) => g === r).length), [gradeHistory])

  const lastItem = reviewedItems.length > 0 ? reviewedItems[reviewedItems.length - 1] : null
  const inviteUrl = buildWhatsAppInvite({
    verseRef: lastItem?.reference,
    verseText: lastItem?.verseText,
  })

  return (
    <div className="page review-page">
      <div className="session-complete">
        <h2>Sessão concluída!</h2>
        <p className="session-complete-count">{completed} textos revisados</p>
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
          <button type="button" className="btn btn-primary" onClick={onNewSession}>
            Nova Sessão
          </button>
          <button type="button" className="btn btn-secondary" onClick={onGoBack}>
            Voltar
          </button>
          {inviteUrl && (
            <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              Compartilhar
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
