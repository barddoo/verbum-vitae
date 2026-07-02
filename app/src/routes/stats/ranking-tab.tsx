import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useEffect, useRef, useState } from 'react'
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
  const { user, updateDisplayName } = useAuth()
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [hidden, setHidden] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    api.leaderboard
      .get()
      .then((d) => {
        const resp = d as LeaderboardResponse
        setData(resp)
        setHidden(resp.currentUserHidden)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

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

  const emailPrefix = user.email.split('@')[0]
  const currentDisplayName = user.displayName ?? emailPrefix

  async function handleSaveName() {
    if (!nameInput.trim()) return
    setSaving(true)
    try {
      const newName = nameInput.trim()
      await updateDisplayName(newName)
      setEditing(false)
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          entries: prev.entries.map((e) => (e.isCurrentUser ? { ...e, displayName: newName } : e)),
          currentUserEntry: prev.currentUserEntry ? { ...prev.currentUserEntry, displayName: newName } : null,
        }
      })
    } catch {
      // leave editing open on error
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleVisibility() {
    const newHidden = !hidden
    setHidden(newHidden)
    try {
      await api.leaderboard.updateVisibility(newHidden)
    } catch {
      setHidden(!newHidden)
    }
  }

  return (
    <div className="ranking-tab">
      <div className="ranking-profile">
        {editing ? (
          <div className="ranking-name-edit">
            <input
              ref={inputRef}
              type="text"
              className="ranking-name-input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={40}
              placeholder={t`Seu nome público…`}
              spellCheck={false}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveName} disabled={saving}>
              {saving ? <Trans>Salvando…</Trans> : <Trans>Salvar</Trans>}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)} disabled={saving}>
              <Trans>Cancelar</Trans>
            </button>
          </div>
        ) : (
          <div className="ranking-profile-row">
            <span className="ranking-profile-name">{currentDisplayName}</span>
            <button
              type="button"
              className="ranking-edit-btn"
              aria-label={t`Editar nome de exibição`}
              onClick={() => {
                setNameInput(user.displayName ?? '')
                setEditing(true)
              }}
            >
              ✏️
            </button>
          </div>
        )}
        {!user.displayName && !editing && (
          <p className="ranking-name-hint">
            <Trans>Defina seu nome público para aparecer no ranking.</Trans>
          </p>
        )}
        <label className="ranking-visibility-toggle">
          <input type="checkbox" checked={hidden} onChange={handleToggleVisibility} />
          <span>
            <Trans>Ocultar meu nome do ranking</Trans>
          </span>
        </label>
        {hidden && (
          <p className="ranking-hidden-notice">
            <Trans>Você está oculto do ranking.</Trans>
          </p>
        )}
      </div>

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
