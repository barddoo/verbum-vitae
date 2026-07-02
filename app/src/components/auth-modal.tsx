import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../lib/auth'

interface AuthModalProps {
  onClose: () => void
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (tab === 'register' && password !== confirm) {
      setError(t`Senhas não conferem`)
      return
    }
    setLoading(true)
    try {
      if (tab === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
      onClose()
    } catch (err: any) {
      setError(err.message || t`Erro de autenticação`)
    } finally {
      setLoading(false)
    }
  }

  function switchTab(t: 'login' | 'register') {
    setTab(t)
    setError('')
    setPassword('')
    setConfirm('')
  }

  return (
    <div className="modal-backdrop" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={tab === 'login' ? t`Entrar` : t`Criar conta`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label={t`Fechar`}>
          <X size={18} aria-hidden />
        </button>

        <div className="modal-tabs">
          <button type="button" className={`modal-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>
            <Trans>Entrar</Trans>
          </button>
          <button type="button" className={`modal-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => switchTab('register')}>
            <Trans>Criar Conta</Trans>
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <label htmlFor="auth-email">
            <Trans>Email</Trans>
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            spellCheck={false}
            required
          />
          <label htmlFor="auth-password">
            <Trans>Senha</Trans>
          </label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
          />
          {tab === 'register' && (
            <>
              <label htmlFor="auth-confirm">
                <Trans>Confirmar senha</Trans>
              </label>
              <input
                id="auth-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </>
          )}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? (tab === 'login' ? t`Entrando…` : t`Criando…`) : tab === 'login' ? t`Entrar` : t`Criar conta`}
          </button>
        </form>

        <p className="auth-free-notice">
          <Trans>
            Verbum Vitae é <strong>100% gratuito</strong> e sempre será. A conta serve apenas para sincronizar seu progresso entre
            dispositivos: sem cobranças, sem planos, sem coleta de dados.
          </Trans>
        </p>
      </div>
    </div>
  )
}
