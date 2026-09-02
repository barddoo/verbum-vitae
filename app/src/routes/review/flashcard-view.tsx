import { useCallback, useEffect, useMemo, useState } from 'react'
import { getWordHeat } from '../../lib/db'
import type { Grade } from '../../lib/srs'
import { GradingButtons } from './grading-buttons'
import { HeatVerse } from './heat-verse'

export function FlashcardView({
  reference,
  verseText,
  translation,
  verseId,
  onGrade,
  question,
  intervals,
}: {
  reference: string
  verseText: string
  translation: string
  verseId: string
  onGrade: (r: Grade) => void
  question?: string
  intervals?: Partial<Record<Grade, string>>
}) {
  const [flipped, setFlipped] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const [heat, setHeat] = useState<{ index: number; accuracy: number }[]>([])

  const words = useMemo(() => verseText.trim().split(/\s+/), [verseText])

  useEffect(() => {
    getWordHeat(verseId, translation, words.length).then(setHeat)
    setFlipped(false)
    setHintLevel(0)
  }, [verseId, translation, words.length])

  const getHiddenText = useCallback((): string => {
    if (hintLevel === 0) return ''
    const ws = verseText.trim().split(/\s+/)
    return ws
      .map((w, i) => {
        if (i < hintLevel) return w
        if (hintLevel === 1 && i < 3) return w
        if (hintLevel === 1) return w[0] + '_'.repeat(Math.max(w.length - 1, 1))
        return '_'.repeat(w.length)
      })
      .join(' ')
  }, [verseText, hintLevel])

  function advanceHint() {
    if (hintLevel + 1 >= words.length) setFlipped(true)
    else setHintLevel((h) => h + 1)
  }

  // Desktop: Space adds a hint word, Enter reveals. Guarded against inputs so typing mode's own
  // Enter-to-submit is never hijacked.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        if (!flipped) {
          if (hintLevel + 1 >= words.length) setFlipped(true)
          else setHintLevel((h) => h + 1)
        }
      } else if (e.key === 'Enter' && !e.repeat) {
        e.preventDefault()
        if (!flipped) setFlipped(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flipped, hintLevel, words.length])

  return (
    <div className="flashcard">
      <div className={`flip-card ${flipped ? 'flipped' : ''}`}>
        <div className="flip-card-inner">
          <div className="flip-card-front">
            <div className="flip-card-top">
              <h2 className="flashcard-ref">{reference}</h2>
              {question ? <p className="flashcard-question">{question}</p> : <p className="flashcard-hint">Tente recitar mentalmente…</p>}
              {hintLevel > 0 && (
                <div className="flashcard-hint-text">
                  <p>{getHiddenText()}</p>
                </div>
              )}
            </div>
            <div className="flashcard-actions">
              <button type="button" className="btn btn-secondary" onClick={advanceHint}>
                Dica {hintLevel === 0 ? '(1ª letra)' : hintLevel + 1 >= words.length ? '(revelar)' : '(mais palavras)'}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setFlipped(true)}>
                Revelar
              </button>
            </div>
          </div>
          <div className="flip-card-back">
            <h3 className="flashcard-ref-back">{reference}</h3>
            {question && <p className="flashcard-back-label">Resposta:</p>}
            <HeatVerse words={words} heat={heat} />
            <p className="flashcard-translation-label">{translation.toUpperCase()}</p>
          </div>
        </div>
      </div>
      {flipped && <GradingButtons onGrade={onGrade} intervals={intervals} />}
    </div>
  )
}
