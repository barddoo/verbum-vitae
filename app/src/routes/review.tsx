import { useSearch } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { BOOKS, DEFAULT_TRANSLATION, type Translation } from 'shared/bible'
import { db, fetchVersesBatch, getWordHeat, parseVerseKey, recordWordAccuracy } from '../lib/db'
import { getNextCard, Rating } from '../lib/scheduler'
import { type Card, type Grade, getDueCards } from '../lib/srs'
import { logProgressChange } from '../lib/sync'

type PracticeMode = 'flashcard' | 'fill-blank' | 'typing'

interface DueItem {
  progressId: number
  verseId: string
  reference: string
  verseText: string
  card: Card
  translation: string
}

const loadingSpinner = <div className="loading">Carregando...</div>

export function ReviewPage() {
  const { autostart } = useSearch({ from: '/review' })
  const autostartFired = useRef(false)
  const [phase, setPhase] = useState<'queue' | 'session'>('queue')
  const [items, setItems] = useState<DueItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(() => (localStorage.getItem('review_mode') as PracticeMode) || 'flashcard')
  const [filterBook] = useState<number | null>(null)
  const [gradeHistory, setGradeHistory] = useState<Grade[]>([])
  const translation = (localStorage.getItem('translation') as Translation | null) ?? DEFAULT_TRANSLATION

  const allProgress = useLiveQuery(
    () => db.progress.toArray().then((rows) => rows.filter((p) => p.translation === translation)),
    [translation],
  )

  const totalAll = allProgress?.length ?? 0
  const totalDue = allProgress ? getDueCards(allProgress).length : 0
  const loading = allProgress === undefined

  const filterStatus = totalDue > 0 ? 'due' : 'all'

  function setAndPersistMode(m: PracticeMode) {
    setPracticeMode(m)
    localStorage.setItem('review_mode', m)
  }

  useEffect(() => {
    if (!loading && autostart === '1' && totalAll > 0 && phase === 'queue' && !autostartFired.current) {
      autostartFired.current = true
      startReview()
    }
  }, [loading, autostart, totalAll, phase])

  async function startReview() {
    if (!allProgress) return
    setSessionLoading(true)

    let selected = allProgress
    if (filterStatus === 'due') {
      const dueCards = getDueCards(allProgress)
      selected = allProgress.filter((p) => dueCards.some((dc) => dc.verseId === p.verseId))
    }
    if (filterBook !== null) {
      selected = selected.filter((p) => parseVerseKey(p.verseId).bookNumber === filterBook)
    }
    if (selected.length === 0) {
      setSessionLoading(false)
      return
    }

    const cards = getDueCards(selected)
    const cardMap = new Map(cards.map((c) => [c.verseId, c.card]))

    const verseTexts = await fetchVersesBatch(selected.map((p) => ({ verseId: p.verseId, translation: p.translation })))

    const loaded: DueItem[] = []
    for (const p of selected) {
      const card = cardMap.get(p.verseId) || JSON.parse(p.cardJson || '{}')
      const text = verseTexts.get(p.verseId) || ''
      const parsed = parseVerseKey(p.verseId)
      const bookName = BOOKS[parsed.bookNumber]
      const ref = parsed.verseEnd
        ? `${bookName} ${parsed.chapter}:${parsed.verseStart}-${parsed.verseEnd}`
        : `${bookName} ${parsed.chapter}:${parsed.verseStart}`
      loaded.push({
        progressId: p.id!,
        verseId: p.verseId,
        reference: ref,
        verseText: text,
        card: typeof card === 'string' ? JSON.parse(card) : card,
        translation: p.translation,
      })
    }

    setItems(loaded)
    setCurrentIndex(0)
    setCompleted(0)
    setGradeHistory([])
    setPhase('session')
    setSessionLoading(false)
  }

  async function handleGrade(rating: Grade) {
    const item = items[currentIndex]
    if (!item) return

    const { card, dueDate, state } = getNextCard(item.card, rating)

    await db.progress.update(item.progressId, {
      cardJson: JSON.stringify(card),
      dueDate,
      state,
      streak: rating > 1 ? item.card.reps + 1 : 0,
      updatedAt: Date.now(),
    })

    logProgressChange({
      userId: localStorage.getItem('auth_token') ? 'user' : '',
      tableName: 'progress',
      rowId: item.verseId,
      operation: 'update',
      data: JSON.stringify({
        verseId: item.verseId,
        translation: item.translation,
        cardJson: JSON.stringify(card),
        nextReview: new Date(dueDate).toISOString(),
        lastReview: new Date().toISOString(),
      }),
    })

    setCompleted((prev) => prev + 1)
    setGradeHistory((prev) => [...prev, rating])
    setTimeout(() => setCurrentIndex((prev) => prev + 1), 100)
  }

  function goBack() {
    setPhase('queue')
    setItems([])
    setCurrentIndex(0)
    setCompleted(0)
    setGradeHistory([])
  }

  if (loading || sessionLoading)
    return (
      <div className="page">
        {loadingSpinner}
      </div>
    )

  if (phase === 'queue') {
    const reviewCount = filterStatus === 'due' ? totalDue : totalAll
    return (
      <div className="page review-page">
        <div className="review-queue-hero">
          <span className="review-queue-big-num">{reviewCount}</span>
          <span className="review-queue-big-label">
            {totalAll === 0 ? 'nenhum versículo memorizado' : reviewCount === 1 ? 'versículo para revisar' : 'versículos para revisar'}
          </span>
          {filterStatus === 'due' && totalAll > totalDue && totalAll > 0 && (
            <span className="review-queue-total-hint">{totalAll} total</span>
          )}
        </div>
        <div className="review-mode-grid">
          {(['flashcard', 'fill-blank', 'typing'] as PracticeMode[]).map((m) => (
            <button key={m} className={`review-mode-card ${practiceMode === m ? 'active' : ''}`} onClick={() => setAndPersistMode(m)}>
              <span className="review-mode-card-title">
                {m === 'flashcard' ? 'Flashcard' : m === 'fill-blank' ? 'Completar' : 'Digitar'}
              </span>
              <span className="review-mode-card-desc">
                {m === 'flashcard' ? 'Recite mentalmente' : m === 'fill-blank' ? 'Preencha lacunas' : 'Digite de memória'}
              </span>
            </button>
          ))}
        </div>
        <button
          className="btn btn-primary btn-large btn-start"
          onClick={startReview}
          disabled={totalAll === 0 || (filterStatus === 'due' && totalDue === 0)}
        >
          {totalAll === 0 ? 'Adicione versículos para começar' : 'Iniciar Revisão'}
        </button>
        {totalAll === 0 && (
          <p className="queue-empty-hint">
            Vá para <a href="/browse">Bíblia</a> para adicionar versículos.
          </p>
        )}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="page review-page">
        <div className="empty-state">
          <h2>Nada para revisar!</h2>
          <p>{filterStatus === 'due' ? 'Todos os versículos estão em dia.' : 'Nenhum versículo encontrado.'}</p>
          <div className="empty-actions">
            <button className="btn btn-secondary" onClick={goBack}>
              Voltar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (currentIndex >= items.length) {
    const gradeCounts = [1, 2, 3, 4].map((r) => gradeHistory.filter((g) => g === r).length)
    return (
      <div className="page review-page">
        <div className="session-complete">
          <h2>Sessão concluída!</h2>
          <p className="session-complete-count">{completed} versículos revisados</p>
          {completed > 0 && (
            <div className="session-grade-breakdown">
              <span className="grade-breakdown-item grade-breakdown-1" title="Esqueci">
                {gradeCounts[0]} ✗
              </span>
              <span className="grade-breakdown-item grade-breakdown-2" title="Difícil">
                {gradeCounts[1]} ~
              </span>
              <span className="grade-breakdown-item grade-breakdown-3" title="Bom">
                {gradeCounts[2]} ✓
              </span>
              <span className="grade-breakdown-item grade-breakdown-4" title="Fácil">
                {gradeCounts[3]} ★
              </span>
            </div>
          )}
          <div className="session-complete-actions">
            <button className="btn btn-primary" onClick={goBack}>
              Voltar ao painel
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setCurrentIndex(0)
                setCompleted(0)
                setGradeHistory([])
              }}
            >
              Nova sessão
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page review-page review-session">
      <div className="review-header">
        <button className="btn-icon" onClick={goBack} aria-label="Voltar">
          ←
        </button>
        <div className="review-header-center">
          <span className="review-counter">
            {currentIndex + 1}/{items.length}
          </span>
          <div className="practice-mode-selector">
            {(['flashcard', 'fill-blank', 'typing'] as PracticeMode[]).map((m) => (
              <button
                key={m}
                className={`mode-dot ${practiceMode === m ? 'active' : ''}`}
                onClick={() => setAndPersistMode(m)}
                aria-label={m}
                title={m === 'flashcard' ? 'Flashcard' : m === 'fill-blank' ? 'Completar' : 'Digitar'}
              />
            ))}
            <span className="mode-label">
              {practiceMode === 'flashcard' ? 'Flashcard' : practiceMode === 'fill-blank' ? 'Completar' : 'Digitar'}
            </span>
          </div>
        </div>
        <span className="review-completed" title="Concluídos">
          {completed} ✓
        </span>
      </div>
      <div className="review-progress-bar">
        <div className="review-progress-fill" style={{ width: `${(currentIndex / items.length) * 100}%` }} />
      </div>

      {practiceMode === 'flashcard' && (
        <FlashcardView
          key={items[currentIndex].verseId + currentIndex}
          reference={items[currentIndex].reference}
          verseText={items[currentIndex].verseText}
          translation={items[currentIndex].translation}
          verseId={items[currentIndex].verseId}
          onGrade={handleGrade}
        />
      )}
      {practiceMode === 'fill-blank' && (
        <FillInBlankView
          key={items[currentIndex].verseId + currentIndex}
          reference={items[currentIndex].reference}
          verseText={items[currentIndex].verseText}
          translation={items[currentIndex].translation}
          verseId={items[currentIndex].verseId}
          onGrade={handleGrade}
        />
      )}
      {practiceMode === 'typing' && (
        <TypingPracticeView
          key={items[currentIndex].verseId + currentIndex}
          reference={items[currentIndex].reference}
          verseText={items[currentIndex].verseText}
          translation={items[currentIndex].translation}
          verseId={items[currentIndex].verseId}
          onGrade={handleGrade}
        />
      )}
    </div>
  )
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1
  return dp[m][n]
}

const GradingButtons = memo(function GradingButtons({ onGrade }: { onGrade: (r: Grade) => void }) {
  return (
    <div className="flashcard-grade">
      <p className="grade-prompt">Como foi?</p>
      <div className="grade-buttons">
        <button className="btn grade-btn grade-1" onClick={() => onGrade(Rating.Again as Grade)}>
          1<br />
          <small>Esqueci</small>
        </button>
        <button className="btn grade-btn grade-2" onClick={() => onGrade(Rating.Hard as Grade)}>
          2<br />
          <small>Difícil</small>
        </button>
        <button className="btn grade-btn grade-3" onClick={() => onGrade(Rating.Good as Grade)}>
          3<br />
          <small>Bom</small>
        </button>
        <button className="btn grade-btn grade-4" onClick={() => onGrade(Rating.Easy as Grade)}>
          4<br />
          <small>Fácil</small>
        </button>
      </div>
    </div>
  )
})

const HeatVerse = memo(function HeatVerse({ words, heat }: { words: string[]; heat: { index: number; accuracy: number }[] }) {
  return (
    <p className="flashcard-verse heat-verse">
      {words.map((w, i) => {
        const h = heat.find((h) => h.index === i)
        let cls = ''
        if (h && h.accuracy >= 0) {
          if (h.accuracy >= 0.8) cls = 'heat-good'
          else if (h.accuracy >= 0.5) cls = 'heat-ok'
          else cls = 'heat-bad'
        }
        return (
          <span key={i} className={cls}>
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </p>
  )
})

function FlashcardView({
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
  const [flipped, setFlipped] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const [heat, setHeat] = useState<{ index: number; accuracy: number }[]>([])

  const words = useMemo(() => verseText.split(' '), [verseText])

  useEffect(() => {
    getWordHeat(verseId, translation, words.length).then(setHeat)
    setFlipped(false)
    setHintLevel(0)
  }, [verseId, translation, words.length])

  function getHiddenText(): string {
    if (hintLevel === 0) return ''
    const ws = verseText.split(' ')
    return ws
      .map((w, i) => {
        if (hintLevel === 1) return i < 3 ? w : w[0] + '_'.repeat(Math.max(w.length - 1, 1))
        if (i < hintLevel) return w
        return '_ '.repeat(w.length).trim()
      })
      .join(' ')
  }

  return (
    <div className="flashcard">
      <div className={`flip-card ${flipped ? 'flipped' : ''}`}>
        <div className="flip-card-inner">
          <div className="flip-card-front">
            <h2 className="flashcard-ref">{reference}</h2>
            <p className="flashcard-hint">Tente recitar o versículo mentalmente...</p>
            {hintLevel > 0 && (
              <div className="flashcard-hint-text">
                <p>{getHiddenText()}</p>
              </div>
            )}
            <div className="flashcard-actions">
              <button className="btn btn-secondary" onClick={() => setHintLevel((h) => h + 1)}>
                Dica {hintLevel === 0 ? '(1ª letra)' : '(palavras)'}
              </button>
              <button className="btn btn-primary" onClick={() => setFlipped(true)}>
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
      {flipped && <GradingButtons onGrade={onGrade} />}
    </div>
  )
}

function FillInBlankView({
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
                  <span key={i}>
                    {part === null ? <span className="blank-word">_____</span> : <span>{part}</span>}
                    {i < displayParts.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </p>
              <p className="blank-count">Preencha mentalmente {blankIndices.size} palavra(s)</p>
            </div>
            <div className="flashcard-actions">
              <button className="btn btn-primary" onClick={() => setRevealed(true)}>
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

function TypingPracticeView({
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
  const [hasRecorded, setHasRecorded] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const words = useMemo(() => verseText.split(' '), [verseText])

  useEffect(() => {
    getWordHeat(verseId, translation, words.length).then(setHeat)
    setSubmitted(false)
    setHasRecorded(false)
    setInput('')
    inputRef.current?.focus()
  }, [verseId, translation, words.length])

  function handleSubmit() {
    const cleanInput = input.trim().toLowerCase()
    const cleanVerse = verseText.trim().toLowerCase()
    const dist = levenshtein(cleanInput, cleanVerse)
    const maxLen = Math.max(cleanInput.length, cleanVerse.length)
    const acc = maxLen > 0 ? Math.round((1 - dist / maxLen) * 100) : 0
    setAccuracy(acc)
    setSubmitted(true)
    if (!hasRecorded) {
      setHasRecorded(true)
      const typedWords = cleanInput.split(/\s+/)
      const correctWords = cleanVerse.split(/\s+/)
      const correct = new Set<number>()
      const incorrect = new Set<number>()
      correctWords.forEach((w, i) => {
        if (typedWords[i] === w) correct.add(i)
        else incorrect.add(i)
      })
      recordWordAccuracy(verseId, translation, correct, incorrect, words)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) handleSubmit()
    }
  }

  if (!submitted) {
    return (
      <div className="flashcard">
        <div className="typing-card">
          <h2 className="flashcard-ref">{reference}</h2>
          <textarea
            ref={inputRef}
            className="typing-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite o versículo de memória..."
            rows={4}
          />
          <div className="flashcard-actions">
            <button className="btn btn-primary" onClick={handleSubmit} disabled={!input.trim()}>
              Verificar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flashcard">
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
                      <span key={i}>
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
                      <span key={i}>
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
