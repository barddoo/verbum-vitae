import { computeWinner } from './game'

interface Props {
  players: string[]
  scores: number[]
  onRestart: () => void
}

export function ClassroomCelebration({ players, scores, onRestart }: Props) {
  const { indices, tie } = computeWinner(scores)
  const title = !tie
    ? `${players[indices[0]]} venceu!`
    : indices.length === players.length
      ? 'Empate!'
      : `Empate: ${indices.map((i) => players[i]).join(' e ')}!`

  return (
    <div className="cl-celebration">
      <div className="cl-celebration-trophy" aria-hidden="true">
        🏆
      </div>
      <h1 className="cl-celebration-title">{title}</h1>
      <div className="cl-celebration-scores">
        {players.map((name, i) => (
          <div key={i} className={`cl-cel-team cl-p${i}`}>
            <span className="cl-cel-score">{scores[i]}</span>
            <span className="cl-cel-name">{name}</span>
          </div>
        ))}
      </div>
      <button type="button" className="cl-btn-start" onClick={onRestart}>
        Jogar Novamente
      </button>
    </div>
  )
}
