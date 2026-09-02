import { NotificationType } from '@capacitor/haptics'
import { useEffect, useMemo, useRef, useState } from 'react'
import { recordWordAccuracy } from '../../lib/db'
import { hapticNotify } from '../../lib/haptics'
import { isNearMiss, normalizeForComparison } from '../../lib/levenshtein'
import { Rating } from '../../lib/scheduler'
import type { Grade } from '../../lib/srs'
import { GradingButtons } from './grading-buttons'
import { HeatVerse } from './heat-verse'

type WordDiff = { index: number; typed: string; target: string; near: boolean }

function alignTypedWords(
  words: string[],
  inputWords: string[],
): { correct: Set<number>; near: Set<number>; incorrect: Set<number>; diffs: WordDiff[]; accuracy: number } {
  const m = words.length
  const n = inputWords.length
  const nwords = words.map(normalizeForComparison)
  const ninput = inputWords.map(normalizeForComparison)

  // Word-level edit distance (alignment, not positional); near-misses count as matches
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (nwords[i - 1] === ninput[j - 1] || isNearMiss(words[i - 1], inputWords[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack alignment
  const correct = new Set<number>()
  const near = new Set<number>()
  const incorrect = new Set<number>()
  const diffs: WordDiff[] = []
  let i = m
  let j = n
  let insertions = 0
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && nwords[i - 1] === ninput[j - 1]) {
      correct.add(i - 1)
      i--
      j--
    } else if (i > 0 && j > 0 && isNearMiss(words[i - 1], inputWords[j - 1])) {
      near.add(i - 1)
      diffs.unshift({ index: i - 1, typed: inputWords[j - 1], target: words[i - 1], near: true })
      i--
      j--
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      incorrect.add(i - 1)
      diffs.unshift({ index: i - 1, typed: inputWords[j - 1], target: words[i - 1], near: false })
      i--
      j--
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      incorrect.add(i - 1)
      diffs.unshift({ index: i - 1, typed: '', target: words[i - 1], near: false })
      i--
    } else {
      insertions++
      j--
    }
  }

  const accuracy = m > 0 ? Math.round(((correct.size + near.size) / (m + insertions)) * 100) : 100
  return { correct, near, incorrect, diffs, accuracy }
}

export function TypingPracticeView({
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
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [accuracy, setAccuracy] = useState(0)
  const [sessionHeat, setSessionHeat] = useState<{ index: number; accuracy: number }[]>([])
  const [diffWords, setDiffWords] = useState<WordDiff[]>([])
  const [nearWords, setNearWords] = useState<Set<number>>(new Set())
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasRecordedRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const words = useMemo(() => verseText.trim().split(/\s+/), [verseText])

  useEffect(() => {
    setSubmitted(false)
    setSessionHeat([])
    setDiffWords([])
    setNearWords(new Set())
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
    const { correct, near, incorrect, diffs, accuracy: acc } = alignTypedWords(words, inputWords)

    setAccuracy(acc)
    setSessionHeat(words.map((_, idx) => ({ index: idx, accuracy: correct.has(idx) ? 1 : near.has(idx) ? 0.5 : 0 })))
    setNearWords(near)
    setDiffWords(diffs)
    setSubmitted(true)
    if (acc === 100) hapticNotify(NotificationType.Success)

    if (!hasRecordedRef.current) {
      hasRecordedRef.current = true
      // Near-misses count as correct for the accuracy/score but record against the word's
      // heat: a habitual typo would otherwise push the word toward heat-good and it would
      // stop being blanked, reinforcing the misspelling.
      recordWordAccuracy(verseId, translation, correct, new Set([...incorrect, ...near]), words)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const suggestedGrade: Grade =
    accuracy === 100
      ? (Rating.Easy as Grade)
      : accuracy >= 85
        ? (Rating.Good as Grade)
        : accuracy >= 60
          ? (Rating.Hard as Grade)
          : (Rating.Again as Grade)

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
          <HeatVerse words={words} heat={sessionHeat} near={nearWords} />
          {diffWords.length > 0 && (
            <div className="typing-diff-list">
              {diffWords.map(({ index, typed, target, near }) => (
                <div key={index} className="typing-diff-item">
                  <span className={near ? 'diff-near' : 'diff-typed'}>{typed || '—'}</span>
                  <span className="diff-arrow" aria-hidden="true">
                    →
                  </span>
                  <span className="diff-target">{target}</span>
                </div>
              ))}
            </div>
          )}
          <GradingButtons onGrade={onGrade} suggested={suggestedGrade} intervals={intervals} />
        </>
      )}
    </div>
  )
}
