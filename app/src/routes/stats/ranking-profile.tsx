import { Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/worker'

interface RankingProfileProps {
  /** Name as it appears to everyone else — already resolved to the server's fallback. */
  displayName: string
  hasCustomName: boolean
  hidden: boolean
  onHiddenChange: (hidden: boolean) => void
  onRenamed: (name: string) => void
}

export function RankingProfile({ displayName, hasCustomName, hidden, onHiddenChange, onRenamed }: RankingProfileProps) {
  const { updateDisplayName } = useAuth()
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function handleSaveName() {
    const newName = nameInput.trim()
    if (!newName) return
    setSaving(true)
    try {
      await updateDisplayName(newName)
      onRenamed(newName)
      setEditing(false)
    } catch {
      // leave editing open on error
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleVisibility() {
    const next = !hidden
    onHiddenChange(next)
    try {
      await api.leaderboard.updateVisibility(next)
    } catch {
      onHiddenChange(!next)
    }
  }

  return (
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
            placeholder="Seu nome público…"
            autoComplete="nickname"
            spellCheck={false}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveName} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)} disabled={saving}>
            Cancelar
          </button>
        </div>
      ) : (
        <div className="ranking-profile-row">
          <span className="ranking-profile-name">{displayName}</span>
          <button
            type="button"
            className="ranking-edit-btn"
            aria-label="Editar nome de exibição"
            onClick={() => {
              setNameInput(hasCustomName ? displayName : '')
              setEditing(true)
            }}
          >
            <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      )}
      {!hasCustomName && !editing && <p className="ranking-name-hint">Este é seu nome público. Defina um nome para ser reconhecido.</p>}
      <label className="ranking-visibility-toggle">
        <input type="checkbox" checked={hidden} onChange={handleToggleVisibility} />
        <span>Ocultar meu nome do ranking</span>
      </label>
      {hidden && <p className="ranking-hidden-notice">Você está oculto do ranking.</p>}
    </div>
  )
}
