import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useEffect, useState } from 'react'
import type { LeaderboardEntry, LeaderboardResponse } from 'shared/types'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/worker'

const MEDALS = ['🥇', '🥈', '🥉']

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return <span className="ranking-medal">{MEDALS[rank - 1]}</span>
  return <span className="ranking-rank">#{rank}</span>
}

function EntryRow({ entry, highlight }: { entry: LeaderboardEntry; highlight: boolean }) {
  return (
    <div className={`ranking-row${highlight ? ' ranking-row--me' : ''}`}>
      <RankBadge rank={entry.rank} />
      <span className="ranking-name">{entry.displayName}</span>
      <span className="ranking-stat" title={t`Versículos memorizados`}>
        {entry.memorizedCount}{' '}
        <span className="ranking-stat-label">
          <Trans>versíc.</Trans>
        </span>
      </span>
      {entry.currentStreak > 0 && (
        <span className="ranking-streak" title={t`Sequência atual`}>
          🔥{entry.currentStreak}
        </span>
      )}
    </div>
  )
}

export function RankingTab() {
  const { user } = useAuth()
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api.leaderboard
      .get()
      .then((d) => setData(d as LeaderboardResponse))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (!user) {
    return (
      <div className="ranking-empty">
        <p>
          <Trans>Faça login para ver o ranking da comunidade.</Trans>
        </p>
      </div>
    )
  }

  if (loading)
    return (
      <div className="ranking-loading">
        <Trans>Carregando…</Trans>
      </div>
    )
  if (error)
    return (
      <div className="ranking-error">
        <Trans>Erro ao carregar ranking.</Trans>
      </div>
    )

  return (
    <div className="ranking-tab">
      {data && data.entries.length === 0 ? (
        <div className="ranking-empty">
          <p>
            <Trans>Nenhum usuário no ranking ainda. Seja o primeiro!</Trans>
          </p>
        </div>
      ) : (
        <div className="ranking-list">
          {data?.entries.map((entry) => (
            <EntryRow key={entry.rank} entry={entry} highlight={entry.isCurrentUser} />
          ))}
        </div>
      )}

      {data?.currentUserEntry && (
        <>
          <div className="ranking-separator">
            <span>
              <Trans>Sua posição</Trans>
            </span>
          </div>
          <div className="ranking-list">
            <EntryRow entry={data.currentUserEntry} highlight />
          </div>
        </>
      )}
    </div>
  )
}
