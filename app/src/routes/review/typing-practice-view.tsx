import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import { recordWordAccuracy } from '../../lib/db'
import type { Grade } from '../../lib/srs'

const NORMALIZE_WORD = /[^a-zA-ZÀ-ÿ0-9]/g
function norm(w: string) {
  return w.toLowerCase().replace(NORMALIZE_WORD, '')
}

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
  const [sessionHeat, setSessionHeat] = useState<{ index: number; accuracy: number }[]>([])
  const [diffWords, setDiffWords] = useState<{ index: number; typed: string; target: string }[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasRecordedRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const words = useMemo(() => verseText.trim().split(/\s+/), [verseText])

  useEffect(() => {
    setSubmitted(false)
    setSessionHeat([])
    setDiffWords([])
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
    const m = words.length
    const n = inputWords.length

    // Word-level edit distance (alignment, not positional)
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (norm(words[i - 1]) === norm(inputWords[j - 1])) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
        }
      }
    }

    // Backtrack alignment
    const correct = new Set<number>()
    const incorrect = new Set<number>()
    const diffs: { index: number; typed: string; target: string }[] = []
    let i = m
    let j = n
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && norm(words[i - 1]) === norm(inputWords[j - 1])) {
        correct.add(i - 1)
        i--
        j--
      } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
        incorrect.add(i - 1)
        diffs.unshift({ index: i - 1, typed: inputWords[j - 1], target: words[i - 1] })
        i--
        j--
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        incorrect.add(i - 1)
        diffs.unshift({ index: i - 1, typed: '', target: words[i - 1] })
        i--
      } else {
        j--
      }
    }

    const acc = m > 0 ? Math.round((correct.size / Math.max(m, n)) * 100) : 100
    setAccuracy(acc)
    setSessionHeat(words.map((_, idx) => ({ index: idx, accuracy: correct.has(idx) ? 1 : 0 })))
    setDiffWords(diffs)
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
        placeholder={t`Digite de memória…`}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitted}
        spellCheck={false}
        autoComplete="off"
      />
      {!submitted && (
        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!input.trim()}>
          <Trans>Verificar</Trans>
        </button>
      )}
      {submitted && (
        <>
          <div className="typing-accuracy">
            {accuracy === 100 ? (
              <span className="typing-perfect">
                <Trans>Perfeito! 🎉</Trans>
              </span>
            ) : (
              <span className="typing-score">
                <Trans>{accuracy}% de precisão</Trans>
              </span>
            )}
          </div>
          <HeatVerse words={words} heat={sessionHeat} />
          {diffWords.length > 0 && (
            <div className="typing-diff-list">
              {diffWords.map(({ index, typed, target }) => (
                <div key={index} className="typing-diff-item">
                  <span className="diff-typed">{typed || '—'}</span>
                  <span className="diff-arrow" aria-hidden="true">
                    →
                  </span>
                  <span className="diff-target">{target}</span>
                </div>
              ))}
            </div>
          )}
          <GradingButtons onGrade={onGrade} />
        </>
      )}
    </div>
  )
}
