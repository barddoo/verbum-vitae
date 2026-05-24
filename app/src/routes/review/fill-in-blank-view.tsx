import { useEffect, useMemo, useState } from 'react'
import { getWordHeat } from '../../lib/db'
import type { Grade } from '../../lib/srs'
import { GradingButtons } from './grading-buttons'
import { HeatVerse } from './heat-verse'

export function FillInBlankView({
  reference,
  verseText,
  translation,
  verseId,
  onGrade,
}: {
  reference: string
  verseText: string
  translation: string
  verseId: string
  onGrade: (r: Grade) => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [heat, setHeat] = useState<{ index: number; accuracy: number }[]>([])

  const words = useMemo(() => verseText.split(' '), [verseText])

  const blankIndices = useMemo(() => {
    const count = Math.max(1, Math.floor(words.length * 0.35))
    const indices = new Set<number>()
    while (indices.size < count) indices.add(Math.floor(Math.random() * words.length))
    return indices
  }, [words])

  const displayParts = useMemo(() => words.map((w, i) => (blankIndices.has(i) ? null : w)), [words, blankIndices])

  useEffect(() => {
    getWordHeat(verseId, translation, words.length).then(setHeat)
    setRevealed(false)
  }, [verseId, translation, words.length])

  return (
    <div className="flashcard">
      <div className={`flip-card ${revealed ? 'flipped' : ''}`}>
        <div className="flip-card-inner">
          <div className="flip-card-front">
            <h2 className="flashcard-ref">{reference}</h2>
            <div className="fill-blank-text">
              <p>
                {displayParts.map((part, i) => (
                  <span key={`${part}-${i}`}>
                    {part === null ? <span className="blank-word">_____</span> : <span>{part}</span>}
                    {i < displayParts.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </p>
              <p className="blank-count">Preencha mentalmente {blankIndices.size} palavra(s)</p>
            </div>
            <div className="flashcard-actions">
              <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)}>
                Revelar
              </button>
            </div>
          </div>
          <div className="flip-card-back">
            <h3 className="flashcard-ref-back">{reference}</h3>
            <HeatVerse words={words} heat={heat} />
            <p className="flashcard-translation-label">{translation.toUpperCase()}</p>
          </div>
        </div>
      </div>
      {revealed && <GradingButtons onGrade={onGrade} />}
    </div>
  )
}
