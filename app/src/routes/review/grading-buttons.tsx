import { memo } from 'react'
import { Rating } from '../../lib/scheduler'
import type { Grade } from '../../lib/srs'

export const GradingButtons = memo(function GradingButtons({ onGrade }: { onGrade: (r: Grade) => void }) {
  return (
    <div className="flashcard-grade">
      <p className="grade-prompt">Como foi?</p>
      <p className="grade-hint">1 = vejo em breve · 4 = vejo em semanas</p>
      <div className="grade-buttons">
        <button type="button" className="btn grade-btn grade-1" onClick={() => onGrade(Rating.Again as Grade)}>
          1<br />
          <small>Esqueci</small>
        </button>
        <button type="button" className="btn grade-btn grade-2" onClick={() => onGrade(Rating.Hard as Grade)}>
          2<br />
          <small>Difícil</small>
        </button>
        <button type="button" className="btn grade-btn grade-3" onClick={() => onGrade(Rating.Good as Grade)}>
          3<br />
          <small>Bom</small>
        </button>
        <button type="button" className="btn grade-btn grade-4" onClick={() => onGrade(Rating.Easy as Grade)}>
          4<br />
          <small>Fácil</small>
        </button>
      </div>
    </div>
  )
})
