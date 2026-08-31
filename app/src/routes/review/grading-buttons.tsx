import { memo } from 'react'
import { Rating } from '../../lib/scheduler'
import type { Grade } from '../../lib/srs'

export const GradingButtons = memo(function GradingButtons({ onGrade, suggested }: { onGrade: (r: Grade) => void; suggested?: Grade }) {
  const gradeBtn = (r: Grade, label: string) => (
    <button
      type="button"
      className={`btn grade-btn grade-${r}${suggested === r ? ' grade-suggested' : ''}`}
      aria-current={suggested === r ? 'true' : undefined}
      onClick={() => onGrade(r)}
    >
      {r}
      <br />
      <small>{label}</small>
    </button>
  )
  return (
    <div className="flashcard-grade">
      <p className="grade-prompt">Como foi?</p>
      <p className="grade-hint">1 = vejo em breve · 4 = vejo em semanas</p>
      <div className="grade-buttons">
        {gradeBtn(Rating.Again as Grade, 'Esqueci')}
        {gradeBtn(Rating.Hard as Grade, 'Difícil')}
        {gradeBtn(Rating.Good as Grade, 'Bom')}
        {gradeBtn(Rating.Easy as Grade, 'Fácil')}
      </div>
    </div>
  )
})
