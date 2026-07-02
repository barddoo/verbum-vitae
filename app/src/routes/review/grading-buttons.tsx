import { Trans } from '@lingui/react/macro'
import { memo } from 'react'
import { Rating } from '../../lib/scheduler'
import type { Grade } from '../../lib/srs'

export const GradingButtons = memo(function GradingButtons({ onGrade }: { onGrade: (r: Grade) => void }) {
  return (
    <div className="flashcard-grade">
      <p className="grade-prompt">
        <Trans>Como foi?</Trans>
      </p>
      <p className="grade-hint">
        <Trans>1 = vejo em breve · 4 = vejo em semanas</Trans>
      </p>
      <div className="grade-buttons">
        <button type="button" className="btn grade-btn grade-1" onClick={() => onGrade(Rating.Again as Grade)}>
          1<br />
          <small>
            <Trans>Esqueci</Trans>
          </small>
        </button>
        <button type="button" className="btn grade-btn grade-2" onClick={() => onGrade(Rating.Hard as Grade)}>
          2<br />
          <small>
            <Trans>Difícil</Trans>
          </small>
        </button>
        <button type="button" className="btn grade-btn grade-3" onClick={() => onGrade(Rating.Good as Grade)}>
          3<br />
          <small>
            <Trans>Bom</Trans>
          </small>
        </button>
        <button type="button" className="btn grade-btn grade-4" onClick={() => onGrade(Rating.Easy as Grade)}>
          4<br />
          <small>
            <Trans>Fácil</Trans>
          </small>
        </button>
      </div>
    </div>
  )
})
