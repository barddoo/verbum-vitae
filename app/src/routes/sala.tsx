import { useCallback, useEffect, useState } from 'react'
import type { VerseItem } from './sala/blanks'
import { ClassroomCelebration } from './sala/celebration'
import { defaultPlayers, type Mode, scoreKeyToIndex } from './sala/game'
import { ClassroomPresentation } from './sala/presentation'
import { ClassroomSetup } from './sala/setup'

type Phase = 'setup' | 'presenting' | 'celebration'

interface State {
  phase: Phase
  verses: VerseItem[]
  mode: Mode
  players: string[]
  scores: number[]
  verseIndex: number
  revealedCount: number
  questionShown: boolean
}

const INIT: State = {
  phase: 'setup',
  verses: [],
  mode: 'teams',
  players: defaultPlayers('teams'),
  scores: [0, 0],
  verseIndex: 0,
  revealedCount: 0,
  questionShown: false,
}

export function ClassroomPage() {
  const [state, setState] = useState<State>(INIT)

  const handleNext = useCallback(() => {
    setState((s) =>
      s.verseIndex + 1 >= s.verses.length
        ? { ...s, phase: 'celebration' }
        : { ...s, verseIndex: s.verseIndex + 1, revealedCount: 0, questionShown: false },
    )
  }, [])

  const onReveal = useCallback(() => {
    setState((s) => {
      const blanks = s.verses[s.verseIndex]?.tokens.filter((t) => t.isBlank).length ?? 0
      return { ...s, revealedCount: Math.min(s.revealedCount + 1, blanks) }
    })
  }, [])

  const onScore = useCallback((player: number) => {
    setState((s) => (player >= s.players.length ? s : { ...s, scores: s.scores.map((v, i) => (i === player ? v + 1 : v)) }))
  }, [])

  const onReset = useCallback(() => setState((s) => ({ ...s, revealedCount: 0, questionShown: false })), [])
  const onToggleQuestion = useCallback(() => setState((s) => ({ ...s, questionShown: !s.questionShown })), [])
  const onExit = useCallback(() => setState((s) => ({ ...s, phase: 'setup' })), [])

  useEffect(() => {
    if (state.phase !== 'presenting') return
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          onReveal()
          break
        case 'KeyN':
          handleNext()
          break
        case 'KeyQ':
          onToggleQuestion()
          break
        case 'KeyR':
          onReset()
          break
        case 'Escape':
          onExit()
          break
        default: {
          const idx = scoreKeyToIndex(e.code)
          if (idx !== null) onScore(idx)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.phase, onReveal, onScore, handleNext, onReset, onToggleQuestion, onExit])

  function handleStart(verses: VerseItem[], mode: Mode, players: string[]) {
    setState({ ...INIT, phase: 'presenting', verses, mode, players, scores: players.map(() => 0) })
  }

  const totalBlanks = state.verses[state.verseIndex]?.tokens.filter((t) => t.isBlank).length ?? 0

  if (state.phase === 'celebration') {
    return (
      <div className="cl-overlay">
        <ClassroomCelebration players={state.players} scores={state.scores} onRestart={() => setState(INIT)} />
      </div>
    )
  }

  if (state.phase === 'setup') {
    return (
      <div className="cl-overlay">
        <ClassroomSetup onStart={handleStart} />
      </div>
    )
  }

  return (
    <div className="cl-overlay">
      <ClassroomPresentation
        verses={state.verses}
        verseIndex={state.verseIndex}
        revealedCount={state.revealedCount}
        scores={state.scores}
        players={state.players}
        totalBlanks={totalBlanks}
        onReveal={onReveal}
        onScore={onScore}
        onNext={handleNext}
        onReset={onReset}
        questionShown={state.questionShown}
        onToggleQuestion={onToggleQuestion}
        onExit={onExit}
      />
    </div>
  )
}
