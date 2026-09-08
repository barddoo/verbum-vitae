import { remindersAvailable } from '../../lib/daily-reminder'
import { DailyReminderCard } from '../daily-reminder-card'

export function ReminderSection() {
  const available = remindersAvailable()

  return (
    <section className="settings-section" aria-labelledby="settings-reminder-title">
      <h2 id="settings-reminder-title" className="settings-section-title">
        Lembrete diário
      </h2>
      {available ? (
        <DailyReminderCard />
      ) : (
        <div className="settings-card">
          <p className="settings-hint">
            O lembrete diário de revisão funciona no aplicativo instalado. Instale o Verbum Vitae no seu Android ou iPhone para agendar o
            horário da revisão.
          </p>
        </div>
      )}
    </section>
  )
}
