import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Check } from 'lucide-react'
import { PageMeta } from '../../components/page-meta'
import type { PracticeMode } from '../../hooks/use-review-queue'
import type { DueItem } from '../../hooks/use-review-session'
import type { Grade } from '../../lib/srs'
import { FillInBlankView } from './fill-in-blank-view'
import { FlashcardView } from './flashcard-view'
import { TypingPracticeView } from './typing-practice-view'

interface SessionViewProps {
  items: DueItem[]
  currentIndex: number
  completed: number
  practiceMode: PracticeMode
  setAndPersistMode: (m: PracticeMode) => void
  progressiveBlanks: boolean
  goBack: () => void
  handleSkip: () => void
  handleGrade: (r: Grade) => void
}

export function SessionView(props: SessionViewProps) {
  const { items, currentIndex, completed, practiceMode, setAndPersistMode, progressiveBlanks, goBack, handleSkip, handleGrade } = props
  const currentItem = items[currentIndex]

  return (
    <div className="page review-page review-session">
      <PageMeta
        title={t`Revisar · Verbum Vitae`}
        description={t`Revise versículos memorizados com repetição espaçada. Flashcards, preenchimento de lacunas e prática de digitação para fixar a Palavra.`}
        path="/review"
      />
      <div className="review-header">
        <button type="button" className="btn-icon" onClick={goBack} aria-label={t`Voltar`}>
          ←
        </button>
        <div className="review-header-center">
          <span className="review-counter">
            {currentIndex + 1}/{items.length}
          </span>
          <div className="practice-mode-selector">
            {(['fill-blank', 'flashcard', 'typing'] as PracticeMode[]).map((m) => (
              <button
                type="button"
                key={m}
                className={`mode-dot ${practiceMode === m ? 'active' : ''}`}
                onClick={() => setAndPersistMode(m)}
                aria-label={m === 'flashcard' ? t`Flashcard` : m === 'fill-blank' ? t`Completar` : t`Digitar`}
                title={m === 'flashcard' ? t`Flashcard` : m === 'fill-blank' ? t`Completar` : t`Digitar`}
              />
            ))}
            <span className="mode-label">
              {practiceMode === 'flashcard' ? t`Flashcard` : practiceMode === 'fill-blank' ? t`Completar` : t`Digitar`}
            </span>
          </div>
        </div>
        <span className="review-completed" title={t`Concluídos`}>
          {completed} <Check size={12} aria-hidden />
        </span>
      </div>
      <div className="review-progress-bar">
        <div className="review-progress-fill" style={{ width: `${(currentIndex / items.length) * 100}%` }} />
      </div>
      <div className="review-skip-row">
        <button type="button" className="btn-skip" onClick={handleSkip} aria-label={t`Pular versículo`}>
          <Trans>Pular →</Trans>
        </button>
      </div>

      {practiceMode === 'flashcard' && (
        <FlashcardView
          key={currentItem.verseId + currentIndex}
          reference={currentItem.reference}
          verseText={currentItem.verseText}
          translation={currentItem.translation}
          verseId={currentItem.verseId}
          onGrade={handleGrade}
          question={currentItem.question}
        />
      )}
      {practiceMode === 'fill-blank' && (
        <FillInBlankView
          key={currentItem.verseId + currentIndex}
          reference={currentItem.reference}
          verseText={currentItem.verseText}
          translation={currentItem.translation}
          verseId={currentItem.verseId}
          onGrade={handleGrade}
          question={currentItem.question}
          progressive={progressiveBlanks}
        />
      )}
      {practiceMode === 'typing' && (
        <TypingPracticeView
          key={currentItem.verseId + currentIndex}
          reference={currentItem.reference}
          verseText={currentItem.verseText}
          translation={currentItem.translation}
          verseId={currentItem.verseId}
          onGrade={handleGrade}
          question={currentItem.question}
        />
      )}
    </div>
  )
}
