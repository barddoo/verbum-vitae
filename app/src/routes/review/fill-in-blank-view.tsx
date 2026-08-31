import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { getWordHeat, recordWordAccuracy } from '../../lib/db'
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

function pickBlankIndices(pool: number[], count: number, heat: Map<number, number>, rand: () => number): Set<number> {
  // Bias toward low-accuracy words, keeping seeded randomness so the selection does not
  // ossify. Unknown heat defaults to neutral.
  const weight = (i: number) => {
    const acc = heat.get(i) ?? -1
    const known = acc >= 0 ? acc : 0.5
    return (1 - known) * (0.75 + 0.5 * rand())
  }
  const items = pool.map((i) => ({ i, w: weight(i) }))
  const indices = new Set<number>()
  while (indices.size < count && items.length > 0) {
    let total = 0
    for (const it of items) total += it.w
    if (total <= 0) break
    let pick = rand() * total
    let k = 0
    for (; k < items.length - 1; k++) {
      pick -= items[k].w
      if (pick <= 0) break
    }
    indices.add(items[k].i)
    items.splice(k, 1)
  }
  for (const it of items) {
    if (indices.size >= count) break
    indices.add(it.i)
  }
  return indices
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
  const hasRecordedRef = useRef(false)
  const interactedRef = useRef(false)

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
    return pickBlankIndices(pool, count, heat, rand)
  }, [verseId, words, today, heat])

  // The blank set re-picks once after the local heat query resolves. Follow it until the
  // user taps, then freeze it: a mid-session resolve must not shift blanks under the user
  // or misattribute recording against a set the user never saw.
  const [stableBlanks, setStableBlanks] = useState<Set<number>>(blankIndices)

  useEffect(() => {
    if (interactedRef.current) return
    setStableBlanks(blankIndices)
  }, [blankIndices])

  useEffect(() => {
    getWordHeat(verseId, translation, words.length).then((h) => {
      const map = new Map<number, number>()
      for (const item of h) map.set(item.index, item.accuracy)
      setHeat(map)
    })
    setRevealed(false)
    setRevealedIndices(new Set())
    setRevealedAll(false)
    hasRecordedRef.current = false
    interactedRef.current = false
    setStableBlanks(blankIndices)
  }, [verseId, translation, words.length])

  const allRevealed = progressive
    ? revealedAll || stableBlanks.size === 0 || (stableBlanks.size > 0 && revealedIndices.size === stableBlanks.size)
    : revealed

  useEffect(() => {
    if (!progressive || !allRevealed || hasRecordedRef.current) return
    hasRecordedRef.current = true
    const incorrect = revealedIndices
    if (revealedAll) {
      // "Revelar todos" is a bulk give-up gesture: record only the blanks the user
      // explicitly tapped as incorrect. Crediting the untapped blanks as correct (the
      // individual-tap path) would pollute word heat with an optimistic bulk signal.
      recordWordAccuracy(verseId, translation, new Set(), incorrect, words)
    } else {
      const correct = new Set([...stableBlanks].filter((i) => !incorrect.has(i)))
      recordWordAccuracy(verseId, translation, correct, incorrect, words)
    }
  }, [progressive, allRevealed, revealedIndices, stableBlanks, revealedAll, verseId, translation, words])

  function revealWord(i: number) {
    interactedRef.current = true
    setRevealedIndices((prev) => {
      const next = new Set(prev)
      next.add(i)
      return next
    })
  }

  function revealAll() {
    interactedRef.current = true
    setRevealedAll(true)
  }

  return (
    <div className="fill-blank">
      <h2 className="view-ref">{reference}</h2>
      {question && <p className="flashcard-question">{question}</p>}
      <div className="fill-blank-text">
        {words.map((word, i) => {
          const blank = stableBlanks.has(i)
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
          stableBlanks.size > 0 &&
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
