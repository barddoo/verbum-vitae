import { Check } from 'lucide-react'
import { PageMeta } from '../../components/page-meta'
import type { Grade } from '../../lib/srs'
import { FillInBlankView } from './fill-in-blank-view'
import { FlashcardView } from './flashcard-view'
import { modeMeta, PRACTICE_MODES, type PracticeMode, type ReviewItem } from './review-types'
import { TypingPracticeView } from './typing-practice-view'
import { VerseContext } from './verse-context'

interface ReviewSessionProps {
  itemsLength: number
  currentIndex: number
  item: ReviewItem
  completed: number
  practiceMode: PracticeMode
  progressive: boolean
  intervals: Partial<Record<Grade, string>>
  skippedInSession: number
  canUndo: boolean
  onBack: () => void
  onUndo: () => void
  onSkip: () => void
  onGrade: (r: Grade) => void
  onModeChange: (m: PracticeMode) => void
}

export function ReviewSession(props: ReviewSessionProps) {
  const { item, practiceMode, intervals, progressive } = props
  const meta = modeMeta(practiceMode)

  const common = {
    key: item.verseId + props.currentIndex,
    reference: item.reference,
    verseText: item.verseText,
    translation: item.translation,
    verseId: item.verseId,
    onGrade: props.onGrade,
    question: item.question,
    intervals,
  }

  return (
    <>
      <PageMeta
        title="Revisar · Verbum Vitae"
        description="Revise versículos memorizados com repetição espaçada. Flashcards, preenchimento de lacunas e prática de digitação para fixar a Palavra."
        path="/review"
      />
      <div className="page review-page review-session">
        <div className="review-header">
          <button type="button" className="btn-icon" onClick={props.onBack} aria-label="Voltar">
            ←
          </button>
          <div className="review-header-center">
            <span className="review-counter">
              {props.currentIndex + 1}/{props.itemsLength}
            </span>
            <div className="practice-mode-selector">
              {PRACTICE_MODES.map(({ value, title }) => (
                <button
                  type="button"
                  key={value}
                  className={`mode-dot ${practiceMode === value ? 'active' : ''}`}
                  onClick={() => props.onModeChange(value)}
                  aria-label={title}
                  title={title}
                />
              ))}
              <span className="mode-label">{meta.title}</span>
            </div>
          </div>
          <span className="review-completed" title="Concluídos">
            {props.completed} <Check size={12} aria-hidden />
          </span>
        </div>
        <div className="review-progress-bar">
          <div className="review-progress-fill" style={{ width: `${(props.currentIndex / props.itemsLength) * 100}%` }} />
        </div>
        <div className="review-skip-row">
          {props.canUndo && (
            <button type="button" className="btn-skip btn-undo" onClick={props.onUndo} aria-label="Desfazer última avaliação">
              ↩ Desfazer
            </button>
          )}
          <div className="review-skip-right">
            {props.skippedInSession > 0 && <span className="review-skip-warn">já pulado {props.skippedInSession}x nesta sessão</span>}
            <button type="button" className="btn-skip" onClick={props.onSkip} aria-label="Pular versículo">
              Pular →
            </button>
          </div>
        </div>

        {practiceMode === 'flashcard' && <FlashcardView {...common} />}
        {practiceMode === 'fill-blank' && <FillInBlankView {...common} progressive={progressive} />}
        {practiceMode === 'first-letter' && <FillInBlankView {...common} firstLetter progressive />}
        {practiceMode === 'typing' && <TypingPracticeView {...common} />}

        <VerseContext verseId={item.verseId} translation={item.translation} reference={item.reference} />
      </div>
    </>
  )
}
