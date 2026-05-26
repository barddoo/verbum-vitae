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

  const words = useMemo(() => verseText.trim().split(/\s+/), [verseText])

  const blankIndices = useMemo(() => {
    const count = Math.max(1, Math.floor(words.length * 0.35))
    const indices = new Set<number>()
    let seed = 0
    for (let i = 0; i < verseId.length; i++) seed = (seed * 31 + verseId.charCodeAt(i)) | 0
    const rand = () => { seed = (seed * 1103515245 + 12345) | 0; return (seed >>> 0) / 4294967296 }
    while (indices.size < count) indices.add(Math.floor(rand() * words.length))
    return indices
  }, [verseId, words])

  const displayParts = useMemo(() => words.map((w, i) => ({ word: w, blank: blankIndices.has(i) })), [words, blankIndices])

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
                    {part.blank ? <span className="blank-word">{'_'.repeat(part.word.length)}</span> : <span>{part.word}</span>}
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
