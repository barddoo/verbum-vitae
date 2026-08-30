import { useEffect, useState } from 'react'
import type { LeaderboardResponse } from 'shared/types'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/worker'
import { RankingProfile } from './ranking-profile'
import { EntryRow } from './ranking-row'

/** Mirrors the worker's fallback (`'Usuário ' || SUBSTR(u.id, 1, 6)`) so the name shown here is the name others see. */
function publicName(id: string, displayName: string | null): string {
  return displayName ?? `Usuário ${id.slice(0, 6)}`
}

export function RankingTab() {
  const { user } = useAuth()
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)
  const userId = user?.id ?? null

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    api.leaderboard
      .get()
      .then((d) => {
        if (cancelled) return
        const resp = d as LeaderboardResponse
        setData(resp)
        setHidden(resp.currentUserHidden)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  function handleRenamed(newName: string) {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        entries: prev.entries.map((e) => (e.isCurrentUser ? { ...e, displayName: newName } : e)),
        currentUserEntry: prev.currentUserEntry ? { ...prev.currentUserEntry, displayName: newName } : null,
      }
    })
  }

  if (!user) {
    return (
      <div className="ranking-empty">
        <p>Faça login para ver o ranking da comunidade.</p>
      </div>
    )
  }

  if (loading) return <div className="ranking-loading">Carregando…</div>
  if (error) return <div className="ranking-error">Erro ao carregar ranking.</div>

  return (
    <div className="ranking-tab">
      <RankingProfile
        displayName={publicName(user.id, user.displayName)}
        hasCustomName={Boolean(user.displayName)}
        hidden={hidden}
        onHiddenChange={setHidden}
        onRenamed={handleRenamed}
      />

      {data && data.entries.length === 0 ? (
        <div className="ranking-empty">
          <p>Nenhum usuário no ranking ainda. Seja o primeiro!</p>
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
            <span>Sua posição</span>
          </div>
          <div className="ranking-list">
            <EntryRow entry={data.currentUserEntry} highlight />
          </div>
        </>
      )}
    </div>
  )
}
