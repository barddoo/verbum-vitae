import { useState } from 'react'
import { applyReminder, type DailyReminder, loadReminder, remindersAvailable, saveReminder } from '../lib/daily-reminder'

function toHHMM(r: DailyReminder): string {
  const hh = String(r.hour).padStart(2, '0')
  const mm = String(r.minute).padStart(2, '0')
  return `${hh}:${mm}`
}

export function DailyReminderCard() {
  const [reminder, setReminder] = useState<DailyReminder | null>(() => loadReminder())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const available = remindersAvailable()

  // No stored preference yet → nothing enabled; show the picker with a sensible default time.
  const current: DailyReminder = reminder ?? { enabled: false, hour: 8, minute: 0 }

  async function update(next: DailyReminder) {
    setError(null)
    setBusy(true)
    try {
      await applyReminder(next)
      saveReminder(next)
      setReminder(next)
    } catch {
      setError('Permissão de notificação negada — ative nas configurações do sistema.')
      saveReminder({ ...next, enabled: false })
      setReminder({ ...next, enabled: false })
    } finally {
      setBusy(false)
    }
  }

  if (!available) return null

  return (
    <div className="reminder-card">
      <label className="reminder-row">
        <input
          type="checkbox"
          checked={current.enabled}
          disabled={busy}
          onChange={(e) => {
            void update({ ...current, enabled: e.target.checked })
          }}
        />
        <span className="reminder-label">Lembrete diário de revisão</span>
      </label>
      {current.enabled && (
        <label className="reminder-time-row">
          <span className="reminder-time-label">Horário</span>
          <input
            type="time"
            className="reminder-time-input"
            value={toHHMM(current)}
            disabled={busy}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number)
              if (Number.isInteger(h) && Number.isInteger(m)) void update({ ...current, hour: h, minute: m })
            }}
          />
        </label>
      )}
      {error && <p className="reminder-error">{error}</p>}
      {current.enabled && !error && <p className="reminder-status">Ativo todos os dias às {toHHMM(current)}</p>}
    </div>
  )
}
