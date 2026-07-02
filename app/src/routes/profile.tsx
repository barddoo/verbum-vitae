import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { useEffect, useRef, useState } from 'react'
import { MemorizedVersesTab } from '../components/memorized-verses-tab'
import { PageMeta } from '../components/page-meta'
import { useAuth } from '../lib/auth'
import { db } from '../lib/db'
import { computeStreak } from '../lib/stats'
import { RankingTab } from './profile/ranking-tab'
import { SettingsTab } from './profile/settings-tab'
import { StreakCalendar } from './profile/streak-calendar'

type Tab = 'progresso' | 'configuracoes' | 'ranking'

export function ProfilePage() {
  useLingui()
  const { user, updateDisplayName } = useAuth()
  const [tab, setTab] = useState<Tab>('progresso')
  const [progress, setProgress] = useState<{
    total: number
    byState: Record<number, number>
    streak: number
    reviewsToday: number
  }>({ total: 0, byState: {}, streak: 0, reviewsToday: 0 })
  const [reviewDays, setReviewDays] = useState<Map<string, number>>(new Map())
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadStats()
  }, [])
  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function loadStats() {
    const all = await db.progress.toArray()
    const today = new Date().toDateString()
    const byState: Record<number, number> = {}
    let reviewsToday = 0
    const dayCount = new Map<string, number>()
    for (const p of all) {
      byState[p.state] = (byState[p.state] || 0) + 1
      if (new Date(p.updatedAt).toDateString() === today) reviewsToday++
      const dayStr = new Date(p.updatedAt).toDateString()
      dayCount.set(dayStr, (dayCount.get(dayStr) || 0) + 1)
    }
    setReviewDays(dayCount)
    setProgress({ total: all.length, byState, streak: computeStreak(all.map((p) => p.updatedAt)), reviewsToday })
  }

  async function handleSaveName() {
    if (!nameInput.trim()) return
    setSaving(true)
    try {
      await updateDisplayName(nameInput.trim())
      setEditing(false)
    } catch {
      // leave editing open on error
    } finally {
      setSaving(false)
    }
  }

  const emailPrefix = user?.email.split('@')[0]
  const displayName = user?.displayName ?? emailPrefix

  const stateNames: Record<number, string> = { 0: t`Novo`, 1: t`Aprendendo`, 2: t`Revisando`, 3: t`Reaprendendo` }

  return (
    <div className="page profile-page">
      <PageMeta
        title={t`Perfil · Verbum Vitae`}
        description={t`Seu perfil, configurações e progresso na memorização bíblica.`}
        path="/profile"
      />
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          {displayName ? displayName[0].toUpperCase() : '?'}
        </div>
        <div className="profile-info">
          {editing ? (
            <div className="profile-name-edit">
              <input
                ref={inputRef}
                type="text"
                className="profile-name-input"
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
            <div className="profile-name-row">
              <span className="profile-display-name">{displayName ?? t`Visitante`}</span>
              {user && (
                <button
                  type="button"
                  className="profile-edit-btn"
                  aria-label={t`Editar nome de exibição`}
                  onClick={() => {
                    setNameInput(user.displayName ?? '')
                    setEditing(true)
                  }}
                >
                  ✏️
                </button>
              )}
            </div>
          )}
          {user ? (
            <span className="profile-email">{user.email}</span>
          ) : (
            <span className="profile-guest-hint">
              <Trans>Entre para sincronizar e participar do ranking</Trans>
            </span>
          )}
        </div>
      </div>

      <div className="profile-tabs" role="tablist">
        {(['progresso', 'configuracoes', 'ranking'] as Tab[]).map((t_) => (
          <button
            key={t_}
            type="button"
            role="tab"
            aria-selected={tab === t_}
            className={`profile-tab${tab === t_ ? ' active' : ''}`}
            onClick={() => setTab(t_)}
          >
            {t_ === 'progresso' && <Trans>Progresso</Trans>}
            {t_ === 'configuracoes' && <Trans>Configurações</Trans>}
            {t_ === 'ranking' && <Trans>Ranking</Trans>}
          </button>
        ))}
      </div>

      {tab === 'progresso' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{progress.total}</span>
              <span className="stat-label">
                <Trans>Versículos</Trans>
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{progress.streak}</span>
              <span className="stat-label">
                <Trans>Sequência</Trans>
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{progress.reviewsToday}</span>
              <span className="stat-label">
                <Trans>Hoje</Trans>
              </span>
            </div>
          </div>
          <StreakCalendar reviewDays={reviewDays} locale={i18n.locale} />
          <div className="stats-breakdown">
            <h3>
              <Trans>Por estágio</Trans>
            </h3>
            {Object.entries(progress.byState).map(([stateNum, count]) => (
              <div key={stateNum} className="breakdown-row">
                <span className="breakdown-label">{stateNames[Number(stateNum)] ?? t`Novo`}</span>
                <div className="breakdown-bar-container">
                  <div className="breakdown-bar" style={{ width: `${progress.total > 0 ? (count / progress.total) * 100 : 0}%` }} />
                </div>
                <span className="breakdown-count">{count}</span>
              </div>
            ))}
          </div>
          {progress.total === 0 && (
            <div className="stats-empty">
              <Trans>
                Nenhum versículo estudado ainda.
                <br />
                Comece a revisar para ver seu progresso aqui.
              </Trans>
            </div>
          )}
          <MemorizedVersesTab />
        </>
      )}
      {tab === 'configuracoes' && <SettingsTab onClearProgress={loadStats} />}
      {tab === 'ranking' && <RankingTab />}
    </div>
  )
}
