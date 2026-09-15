import { Link } from '@tanstack/react-router'
import { PageMeta } from '../components/page-meta'
import { AccountSection } from '../components/settings/account-section'
import { AppearanceSection } from '../components/settings/appearance-section'
import { ReminderSection } from '../components/settings/reminder-section'

export function SettingsPage() {
  return (
    <>
      <PageMeta
        title="Ajustes — Verbum Vitae"
        description="Gerencie sua conta, o tema do aplicativo e o lembrete diário de revisão."
        path="/ajustes"
      />
      <div className="page settings-page">
        <h1 className="settings-page-title">Ajustes</h1>
        <AccountSection />
        <AppearanceSection />
        <ReminderSection />

        <section className="settings-section" aria-labelledby="settings-tips-title">
          <h2 id="settings-tips-title" className="settings-section-title">
            Dicas de memorização
          </h2>
          <div className="settings-card">
            <p className="settings-hint">Pequenos hábitos multiplicam sua retenção. Saiba como aproveitar o app e memorizar melhor.</p>
            <Link to="/dicas" className="btn btn-secondary btn-sm">
              Ver dicas
            </Link>
          </div>
        </section>

        <p className="settings-footer">
          <Link to="/privacidade">Política de Privacidade</Link>
        </p>
        <p className="settings-footer settings-footer-credits">
          Ilustrações por{' '}
          <a href="https://storyset.com" target="_blank" rel="noopener noreferrer">
            Storyset
          </a>
        </p>
      </div>
    </>
  )
}
