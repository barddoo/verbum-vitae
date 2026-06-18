import { Fragment, useEffect, useMemo, useState } from 'react'
import { getWordHeat } from '../../lib/db'
import type { Grade } from '../../lib/srs'
import { GradingButtons } from './grading-buttons'

const WORD_SPLIT = /\s+/
const STRIP_NON_ALPHA = /[^a-zA-ZÀ-ÿ]/g
const PUNCT_PREFIX = /^[^a-zA-ZÀ-ÿ0-9]*/
const PUNCT_SUFFIX = /[^a-zA-ZÀ-ÿ0-9]*$/

function blankFor(word: string): string {
  const pre = word.match(PUNCT_PREFIX)?.[0] ?? ''
  const suf = word.match(PUNCT_SUFFIX)?.[0] ?? ''
  const core = word.slice(pre.length, word.length - suf.length)
  return pre + '_'.repeat(core.length) + suf
}

function heatClass(accuracy: number): string {
  if (accuracy < 0) return ''
  if (accuracy >= 0.8) return 'heat-good'
  if (accuracy >= 0.5) return 'heat-ok'
  return 'heat-bad'
}

export function FillInBlankView({
  reference,
  verseText,
  translation,
  verseId,
  onGrade,
  question,
  progressive = false,
}: {
  reference: string
  verseText: string
  translation: string
  verseId: string
  onGrade: (r: Grade) => void
  question?: string
  progressive?: boolean
}) {
  const [revealed, setRevealed] = useState(false)
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set())
  const [revealedAll, setRevealedAll] = useState(false)
  const [heat, setHeat] = useState<Map<number, number>>(new Map())

  const words = useMemo(() => verseText.trim().split(WORD_SPLIT), [verseText])

  const today = Math.floor(Date.now() / 86400000)

  const blankIndices = useMemo(() => {
    const eligible = words.map((_, i) => i).filter((i) => i !== 0 && words[i].replace(STRIP_NON_ALPHA, '').length >= 3)
    const pool = eligible.length > 0 ? eligible : words.map((_, i) => i).filter((i) => i !== 0)
    if (pool.length === 0) return new Set<number>()
    const count = Math.max(1, Math.floor(pool.length * 0.35))
    let seed = today
    for (let i = 0; i < verseId.length; i++) seed = (seed * 31 + verseId.charCodeAt(i)) | 0
    const rand = () => {
      seed = (seed * 1103515245 + 12345) | 0
      return (seed >>> 0) / 4294967296
    }
    const indices = new Set<number>()
    while (indices.size < count) indices.add(pool[Math.floor(rand() * pool.length)])
    return indices
  }, [verseId, words, today])

  useEffect(() => {
    getWordHeat(verseId, translation, words.length).then((h) => {
      const map = new Map<number, number>()
      for (const item of h) map.set(item.index, item.accuracy)
      setHeat(map)
    })
    setRevealed(false)
    setRevealedIndices(new Set())
    setRevealedAll(false)
  }, [verseId, translation, words.length])

  const allRevealed = progressive
    ? revealedAll || blankIndices.size === 0 || (blankIndices.size > 0 && revealedIndices.size === blankIndices.size)
    : revealed

  function revealWord(i: number) {
    setRevealedIndices((prev) => {
      const next = new Set(prev)
      next.add(i)
      return next
    })
  }

  function revealAll() {
    setRevealedAll(true)
  }

  return (
    <div className="fill-blank">
      <h2 className="view-ref">{reference}</h2>
      {question && <p className="flashcard-question">{question}</p>}
      <div className="fill-blank-text">
        {words.map((word, i) => {
          const blank = blankIndices.has(i)
          const isRevealed = progressive ? revealedAll || revealedIndices.has(i) : revealed
          const hcls = isRevealed && !blank ? heatClass(heat.get(i) ?? -1) : ''
          if (blank && !isRevealed && progressive) {
            return (
              <Fragment key={i}>
                <button
                  type="button"
                  className="fill-blank-word blank-word blank-interactive"
                  onClick={() => revealWord(i)}
                  aria-label="Revelar palavra"
                >
                  {blankFor(word)}
                </button>{' '}
              </Fragment>
            )
          }
          return (
            <Fragment key={i}>
              <span className={`fill-blank-word ${blank ? 'blank-word' : ''} ${blank && isRevealed ? 'blank-revealed' : ''} ${hcls}`}>
                {isRevealed || !blank ? word : '_'.repeat(word.length)}
              </span>{' '}
            </Fragment>
          )
        })}
      </div>
      <div className="fill-blank-actions">
        {progressive ? (
          blankIndices.size > 0 &&
          !revealedAll && (
            <button type="button" className="btn btn-secondary" onClick={revealAll}>
              Revelar todos
            </button>
          )
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setRevealed(!revealed)}>
            {revealed ? 'Ocultar' : 'Revelar'}
          </button>
        )}
      </div>
      {allRevealed && <GradingButtons onGrade={onGrade} />}
    </div>
  )
}
