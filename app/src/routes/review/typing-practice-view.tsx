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
  question,
}: {
  reference: string
  verseText: string
  translation: string
  verseId: string
  onGrade: (r: Grade) => void
  question?: string
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
    if (submitted || !input.trim()) return

    const inputWords = input.trim().split(/\s+/)
    const totalWords = Math.max(words.length, inputWords.length)
    let correctCount = 0
    const correct = new Set<number>()
    const incorrect = new Set<number>()

    for (let i = 0; i < totalWords; i++) {
      const target = words[i] || ''
      const given = inputWords[i] || ''
      const dist = levenshtein(target.toLowerCase(), given.toLowerCase())
      if (dist === 0) {
        correctCount++
        correct.add(i)
      } else {
        incorrect.add(i)
      }
    }

    const acc = Math.round((correctCount / totalWords) * 100)
    setAccuracy(acc)
    setSubmitted(true)

    if (!hasRecordedRef.current) {
      hasRecordedRef.current = true
      recordWordAccuracy(verseId, translation, correct, incorrect, words)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div ref={cardRef} className="typing-practice">
      <h2 className="view-ref">{reference}</h2>
      {question && <p className="flashcard-question">{question}</p>}
      <textarea
        ref={inputRef}
        className="typing-input"
        placeholder="Digite de memória…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitted}
        spellCheck={false}
        autoComplete="off"
      />
      {!submitted && (
        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!input.trim()}>
          Verificar
        </button>
      )}
      {submitted && (
        <>
          <div className="typing-accuracy">
            {accuracy === 100 ? (
              <span className="typing-perfect">Perfeito! 🎉</span>
            ) : (
              <span className="typing-score">{accuracy}% de precisão</span>
            )}
          </div>
          <HeatVerse words={words} heat={heat} />
          <GradingButtons onGrade={onGrade} />
        </>
      )}
    </div>
  )
}
