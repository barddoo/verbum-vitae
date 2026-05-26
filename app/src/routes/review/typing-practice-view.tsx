import { useEffect, useMemo, useRef, useState } from 'react'
import { getWordHeat, recordWordAccuracy } from '../../lib/db'
import { levenshtein } from '../../lib/levenshtein'
import type { Grade } from '../../lib/srs'
import { GradingButtons } from './grading-buttons'
import { HeatVerse } from './heat-verse'

export function TypingPracticeView({
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
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [accuracy, setAccuracy] = useState(0)
  const [heat, setHeat] = useState<{ index: number; accuracy: number }[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasRecordedRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const words = useMemo(() => verseText.trim().split(/\s+/), [verseText])

  useEffect(() => {
    getWordHeat(verseId, translation, words.length).then(setHeat)
    setSubmitted(false)
    hasRecordedRef.current = false
    setInput('')
    inputRef.current?.focus()
  }, [verseId, translation, words.length])

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  function handleSubmit() {
    const cleanInput = input.trim().toLowerCase()
    const cleanVerse = verseText.trim().toLowerCase()
    const normalizedInput = removePunctuation(cleanInput)
    const normalizedVerse = removePunctuation(cleanVerse)
    const dist = levenshtein(normalizedInput, normalizedVerse)
    const maxLen = Math.max(normalizedInput.length, normalizedVerse.length)
    const acc = maxLen > 0 ? Math.round((1 - dist / maxLen) * 100) : 0
    setAccuracy(acc)
    setSubmitted(true)
    if (!hasRecordedRef.current) {
      hasRecordedRef.current = true
      const typedWords = normalizedInput.split(/\s+/)
      const correctWords = normalizedVerse.split(/\s+/)
      const correct = new Set<number>()
      const incorrect = new Set<number>()
      const lengthMatch = typedWords.length === correctWords.length
      correctWords.forEach((w, i) => {
        if (lengthMatch && typedWords[i] === w) correct.add(i)
        else incorrect.add(i)
      })
      recordWordAccuracy(verseId, translation, correct, incorrect, words)
    }
  }

  function removePunctuation(s: string): string {
    return s
      .replace(/[.,;:!?"'—–\-()«»]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function handleFocus() {
    setTimeout(() => cardRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 400)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) handleSubmit()
    }
  }

  if (!submitted) {
    return (
      <div className="flashcard" ref={cardRef}>
        <div className="typing-card">
          <h2 className="flashcard-ref">{reference}</h2>
          <textarea
            ref={inputRef}
            className="typing-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder="Digite o versículo de memória..."
            rows={4}
            aria-label="Digite o versículo de memória"
          />
          <div className="flashcard-actions">
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!input.trim()}>
              Verificar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flashcard" ref={cardRef}>
      <div className="flashcard-back typing-result-card">
        <h3 className="flashcard-ref-back">{reference}</h3>
        <HeatVerse words={words} heat={heat} />
        <p className="flashcard-translation-label">{translation.toUpperCase()}</p>
        <div className="typing-accuracy-bar">
          <div
            className={`typing-accuracy-fill ${accuracy >= 90 ? 'good' : accuracy >= 70 ? 'ok' : 'bad'}`}
            style={{ width: `${accuracy}%` }}
          />
        </div>
        <span className={`typing-accuracy-label ${accuracy >= 90 ? 'good' : accuracy >= 70 ? 'ok' : 'bad'}`}>
          {accuracy}% correto{accuracy >= 90 ? ' — Ótimo!' : accuracy >= 70 ? ' — Quase lá' : ' — Tente de novo'}
        </span>
        {accuracy < 100 && (
          <details className="typing-diff">
            <summary>Comparar</summary>
            <div className="typing-diff-text">
              <p>
                <strong>Você: </strong>
                {input
                  .trim()
                  .split(/\s+/)
                  .map((w, i) => {
                    const correct = verseText.trim().toLowerCase().split(/\s+/)[i]
                    const ok = w.toLowerCase() === correct
                    return (
                      <span key={`${w}-${i}`}>
                        {i > 0 ? ' ' : ''}
                        <mark className={ok ? 'diff-ok' : 'diff-wrong'}>{w}</mark>
                      </span>
                    )
                  })}
              </p>
              <p>
                <strong>Versículo: </strong>
                {verseText
                  .trim()
                  .split(/\s+/)
                  .map((w, i) => {
                    const typed = input.trim().toLowerCase().split(/\s+/)[i]
                    const ok = typed === w.toLowerCase()
                    return (
                      <span key={`${w}-${i}`}>
                        {i > 0 ? ' ' : ''}
                        <mark className={ok ? 'diff-ok' : 'diff-wrong'}>{w}</mark>
                      </span>
                    )
                  })}
              </p>
            </div>
          </details>
        )}
      </div>
      <GradingButtons onGrade={onGrade} />
    </div>
  )
}
