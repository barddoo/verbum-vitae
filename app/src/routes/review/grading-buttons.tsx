import { memo, useEffect } from 'react'
import { Rating } from '../../lib/scheduler'
import type { Grade } from '../../lib/srs'

const GRADES = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const

export const GradingButtons = memo(function GradingButtons({
  onGrade,
  suggested,
  intervals,
}: {
  onGrade: (r: Grade) => void
  suggested?: Grade
  /** Per-grade next-review label, e.g. { 1: '10min', 2: '1d', 3: '5d', 4: '12d' }. */
  intervals?: Partial<Record<Grade, string>>
}) {
  useEffect(() => {
    // Desktop: 1–4 press a grade directly. The buttons are only mounted once the answer is
    // revealed, so these keys can never grade before the user has seen the text.
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      if (e.key >= '1' && e.key <= '4') {
        const target = e.target as HTMLElement | null
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
        e.preventDefault()
        onGrade(Number(e.key) as Grade)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onGrade])

  const labelFor: Record<Grade, string> = {
    1: 'Esqueci',
    2: 'Difícil',
    3: 'Bom',
    4: 'Fácil',
  }

  const gradeBtn = (r: Grade) => (
    <button
      type="button"
      className={`btn grade-btn grade-${r}${suggested === r ? ' grade-suggested' : ''}`}
      aria-current={suggested === r ? 'true' : undefined}
      onClick={() => onGrade(r)}
    >
      {r}
      <small>{labelFor[r]}</small>
      {intervals?.[r] && <span className="grade-interval">{intervals[r]}</span>}
    </button>
  )

  return (
    <div className="flashcard-grade">
      <p className="grade-prompt">Como foi?</p>
      {intervals ? (
        <p className="grade-hint" aria-hidden="true">
          cada botão mostra quando o texto volta
        </p>
      ) : (
        <p className="grade-hint">1 = vejo em breve · 4 = vejo em semanas</p>
      )}
      <div className="grade-buttons">{GRADES.map((r) => gradeBtn(r as Grade))}</div>
    </div>
  )
})
