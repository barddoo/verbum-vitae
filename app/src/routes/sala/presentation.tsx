import type { VerseItem } from './blanks'
import { Scoreboard } from './scoreboard'

interface PresentationProps {
  verses: VerseItem[]
  verseIndex: number
  revealedCount: number
  scores: number[]
  players: string[]
  totalBlanks: number
  onReveal: () => void
  onScore: (player: number) => void
  onNext: () => void
  onReset: () => void
  questionShown: boolean
  onToggleQuestion: () => void
  onExit: () => void
}

export function ClassroomPresentation({
  verses,
  verseIndex,
  revealedCount,
  scores,
  players,
  totalBlanks,
  onReveal,
  onScore,
  onNext,
  onReset,
  questionShown,
  onToggleQuestion,
  onExit,
}: PresentationProps) {
  const verse = verses[verseIndex]
  const isComplete = revealedCount >= totalBlanks
  const progress = `${verseIndex + 1} / ${verses.length}`

  if (!verse) return null

  return (
    <div className="cl-present">
      <header className="cl-header">
        <Scoreboard players={players} scores={scores} progress={progress} />
      </header>

      <main className="cl-verse-area">
        {verse.reference && <span className="cl-reference">{verse.reference}</span>}
        <p className={`cl-verse-text${verse.text.length > 220 ? ' cl-verse-long' : ''}`}>
          {verse.tokens.map((token, i) => {
            if (!token.isBlank)
              return (
                <span key={i} className="cl-word">
                  {token.raw}{' '}
                </span>
              )
            const revealed = token.blankIndex < revealedCount
            return (
              <span key={i} className={`cl-tile ${revealed ? 'cl-tile-revealed' : 'cl-tile-hidden'}`}>
                {revealed ? token.raw : '?'}{' '}
              </span>
            )
          })}
        </p>
        {verse.question && (isComplete || verse.showQuestion || questionShown) && <p className="cl-question">{verse.question}</p>}
        {isComplete && <p className="cl-complete-badge">Versículo completo!</p>}
      </main>

      <footer className="cl-controls">
        <button
          type="button"
          className="cl-ctrl-btn cl-ctrl-reveal"
          onClick={onReveal}
          disabled={isComplete}
          aria-label="Revelar próxima palavra"
        >
          <span className="cl-ctrl-key">Espaço</span>
          <span className="cl-ctrl-label">Revelar</span>
        </button>
        {players.map((name, i) => (
          <button
            key={i}
            type="button"
            className={`cl-ctrl-btn cl-ctrl-score cl-p${i}`}
            onClick={() => onScore(i)}
            aria-label={`Ponto para ${name}`}
          >
            <span className="cl-ctrl-key">{i + 1}</span>
            <span className="cl-ctrl-label">✓ {name}</span>
          </button>
        ))}
        <button type="button" className="cl-ctrl-btn" onClick={onNext} aria-label="Próximo versículo">
          <span className="cl-ctrl-key">N</span>
          <span className="cl-ctrl-label">Próximo</span>
        </button>
        {verse.question && (
          <button
            type="button"
            className="cl-ctrl-btn"
            onClick={onToggleQuestion}
            aria-pressed={questionShown}
            aria-label="Mostrar pergunta"
          >
            <span className="cl-ctrl-key">Q</span>
            <span className="cl-ctrl-label">Pergunta</span>
          </button>
        )}
        <button type="button" className="cl-ctrl-btn" onClick={onReset} aria-label="Reiniciar versículo">
          <span className="cl-ctrl-key">R</span>
          <span className="cl-ctrl-label">Reiniciar</span>
        </button>
        <button type="button" className="cl-ctrl-btn cl-ctrl-exit" onClick={onExit} aria-label="Sair da apresentação">
          <span className="cl-ctrl-key">Esc</span>
          <span className="cl-ctrl-label">Sair</span>
        </button>
      </footer>
    </div>
  )
}
