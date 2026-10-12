interface Props {
  players: string[]
  scores: number[]
  progress: string
}

export function Scoreboard({ players, scores, progress }: Props) {
  if (players.length === 2) {
    return (
      <>
        <div className="cl-team cl-team-a cl-p0">
          <span className="cl-team-name">{players[0]}</span>
          <span className="cl-team-score">{scores[0]}</span>
        </div>
        <Center progress={progress} />
        <div className="cl-team cl-team-b cl-p1">
          <span className="cl-team-score">{scores[1]}</span>
          <span className="cl-team-name">{players[1]}</span>
        </div>
      </>
    )
  }
  return (
    <>
      <div className="cl-strip">
        {players.map((name, i) => (
          <div key={i} className={`cl-strip-item cl-p${i}`}>
            <span className="cl-strip-name">{name}</span>
            <span className="cl-strip-score">{scores[i]}</span>
          </div>
        ))}
      </div>
      <Center progress={progress} />
    </>
  )
}

function Center({ progress }: { progress: string }) {
  return (
    <div className="cl-header-center">
      <span className="cl-app-name">Verbum Vitae</span>
      <span className="cl-progress">{progress}</span>
    </div>
  )
}
