import type { LeaderboardEntry } from 'shared/types'

const MEDALS = ['🥇', '🥈', '🥉']

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return <span className="ranking-medal">{MEDALS[rank - 1]}</span>
  return <span className="ranking-rank">#{rank}</span>
}

export function EntryRow({ entry, highlight }: { entry: LeaderboardEntry; highlight: boolean }) {
  return (
    <div className={`ranking-row${highlight ? ' ranking-row--me' : ''}`}>
      <RankBadge rank={entry.rank} />
      <span className="ranking-name">{entry.displayName}</span>
      <span className="ranking-stat" title="Versículos memorizados">
        {entry.memorizedCount} <span className="ranking-stat-label">memorizados</span>
      </span>
      {entry.currentStreak > 0 && (
        <span className="ranking-streak" title="Dias seguidos">
          🔥{entry.currentStreak}
        </span>
      )}
    </div>
  )
}
