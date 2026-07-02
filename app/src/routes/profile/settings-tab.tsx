import { Trans } from '@lingui/react/macro'
import { useEffect, useState } from 'react'
import { DEFAULT_TRANSLATION, TRANSLATION_LABELS, TRANSLATIONS, type Translation } from 'shared/bible'
import type { LeaderboardResponse } from 'shared/types'
import { ThemeToggle } from '../../components/theme-toggle'
import { useAuth } from '../../lib/auth'
import { db } from '../../lib/db'
import { cachedGet, cachedSet } from '../../lib/storage'
import { api } from '../../lib/worker'

interface Props {
  onClearProgress: () => void
}

export function SettingsTab({ onClearProgress }: Props) {
  const { user } = useAuth()
  const [translation, setTranslationState] = useState<Translation>(
    () => (cachedGet('translation') as Translation | null) ?? DEFAULT_TRANSLATION,
  )
  const [hidden, setHidden] = useState(false)
  const [hiddenLoaded, setHiddenLoaded] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!user) return
    api.leaderboard
      .get()
      .then((d) => {
        setHidden((d as LeaderboardResponse).currentUserHidden)
        setHiddenLoaded(true)
      })
      .catch(() => setHiddenLoaded(true))
  }, [user])

  function handleTranslationChange(tx: Translation) {
    cachedSet('translation', tx)
    setTranslationState(tx)
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

  async function clearProgress() {
    await db.progress.clear()
    await db.syncLog.clear()
    setConfirming(false)
    onClearProgress()
  }

  const translationLabels = TRANSLATION_LABELS

  return (
    <div className="settings-tab">
      <section className="settings-section">
        <h3 className="settings-section-title">
          <Trans>Aparência</Trans>
        </h3>
        <div className="settings-row">
          <span className="settings-row-label">
            <Trans>Tema</Trans>
          </span>
          <ThemeToggle />
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">
          <Trans>Bíblia</Trans>
        </h3>
        <div className="settings-row">
          <label htmlFor="settings-translation" className="settings-row-label">
            <Trans>Tradução padrão</Trans>
          </label>
          <select
            id="settings-translation"
            className="settings-select"
            value={translation}
            onChange={(e) => handleTranslationChange(e.target.value as Translation)}
          >
            {TRANSLATIONS.map((tx) => (
              <option key={tx} value={tx}>
                {translationLabels[tx]}
              </option>
            ))}
          </select>
        </div>
      </section>

      {user && hiddenLoaded && (
        <section className="settings-section">
          <h3 className="settings-section-title">
            <Trans>Comunidade</Trans>
          </h3>
          <label className="settings-row settings-row--clickable" htmlFor="settings-hidden">
            <span className="settings-row-label">
              <Trans>Ocultar do ranking</Trans>
            </span>
            <input type="checkbox" id="settings-hidden" className="settings-checkbox" checked={hidden} onChange={handleToggleVisibility} />
          </label>
        </section>
      )}

      <section className="settings-section settings-section--danger">
        <h3 className="settings-section-title settings-section-title--danger">
          <Trans>Zona de perigo</Trans>
        </h3>
        {!confirming ? (
          <div className="settings-row">
            <button type="button" className="btn btn-danger-outline" onClick={() => setConfirming(true)}>
              <Trans>Recomeçar do zero</Trans>
            </button>
          </div>
        ) : (
          <div className="settings-confirm">
            <span className="settings-confirm-label">
              <Trans>Isso vai apagar todo o progresso. Tem certeza?</Trans>
            </span>
            <div className="settings-confirm-actions">
              <button type="button" className="btn btn-danger" onClick={clearProgress}>
                <Trans>Sim, limpar</Trans>
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>
                <Trans>Cancelar</Trans>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
