import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { AuthModal } from '../auth-modal'

export function AccountSection() {
  const { user, logout } = useAuth()
  const [authTab, setAuthTab] = useState<'login' | 'register' | null>(null)

  return (
    <section className="settings-section" aria-labelledby="settings-account-title">
      <h2 id="settings-account-title" className="settings-section-title">
        Conta
      </h2>
      <div className="settings-card">
        {user ? (
          <>
            <p className="settings-account-email">{user.email}</p>
            {user.displayName && <p className="settings-account-name">Nome público: {user.displayName}</p>}
            <p className="settings-hint">Seu progresso é sincronizado entre este e outros dispositivos.</p>
            <button type="button" className="btn btn-sm settings-logout" onClick={logout}>
              Sair
            </button>
          </>
        ) : (
          <>
            <p className="settings-hint">Conta opcional: sincroniza seu progresso entre dispositivos. Grátis e sem coleta de dados.</p>
            <div className="settings-account-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setAuthTab('login')}>
                Entrar
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAuthTab('register')}>
                Criar conta
              </button>
            </div>
          </>
        )}
      </div>
      {authTab && <AuthModal initialTab={authTab} onClose={() => setAuthTab(null)} />}
    </section>
  )
}
