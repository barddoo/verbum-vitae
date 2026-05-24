import { useMemo } from 'react'
import type { Grade } from '../../lib/srs'

export function SessionComplete({
  completed,
  gradeHistory,
  onGoBack,
  onNewSession,
}: {
  completed: number
  gradeHistory: Grade[]
  onGoBack: () => void
  onNewSession: () => void
}) {
  const gradeCounts = useMemo(() => [1, 2, 3, 4].map((r) => gradeHistory.filter((g) => g === r).length), [gradeHistory])
  return (
    <div className="page review-page">
      <div className="session-complete">
        <h2>Sessão concluída!</h2>
        <p className="session-complete-count">{completed} versículos revisados</p>
        {completed > 0 && (
          <div className="session-grade-breakdown">
            <span className="grade-breakdown-item grade-breakdown-1" title="Esqueci">
              {gradeCounts[0]} ✗
            </span>
            <span className="grade-breakdown-item grade-breakdown-2" title="Difícil">
              {gradeCounts[1]} △
            </span>
            <span className="grade-breakdown-item grade-breakdown-3" title="Bom">
              {gradeCounts[2]} ✓
            </span>
            <span className="grade-breakdown-item grade-breakdown-4" title="Fácil">
              {gradeCounts[3]} ★
            </span>
          </div>
        )}
        <div className="session-complete-actions">
          <button type="button" className="btn btn-primary" onClick={onGoBack}>
            Voltar ao painel
          </button>
          <button type="button" className="btn btn-secondary" onClick={onNewSession}>
            Repetir sessão
          </button>
        </div>
      </div>
    </div>
  )
}
