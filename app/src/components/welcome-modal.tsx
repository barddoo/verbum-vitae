import { Trans } from '@lingui/react/macro'

interface WelcomeModalProps {
  onClose: () => void
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  function handleClose() {
    localStorage.setItem('welcomed', '1')
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleClose} onKeyDown={(e) => e.key === 'Escape' && handleClose()} role="presentation">
      <div
        className="modal welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="welcome-header">
          <span className="welcome-icon">🕊️</span>
          <h2 id="welcome-title" className="welcome-title">
            <Trans>Bem-vindo ao Verbum Vitae</Trans>
          </h2>
          <span className="welcome-free-badge">
            <Trans>Grátis para sempre</Trans>
          </span>
          <p className="welcome-subtitle">
            <Trans>Obrigado por usar este app. Que a Palavra de Deus habite ricamente em você.</Trans>
          </p>
        </div>

        <blockquote className="welcome-verse">
          <p className="welcome-verse-text">
            <Trans>Guardei no coração a tua palavra para não pecar contra ti.</Trans>
          </p>
          <cite className="welcome-verse-ref">Salmos 119:11 — NVI</cite>
        </blockquote>

        <div className="welcome-tip">
          <p className="welcome-tip-text">
            <Trans>
              A melhor forma de começar é pelas <strong>Coleções</strong> — escolha um tema e comece a memorizar versículos organizados para
              você.
            </Trans>
          </p>
        </div>

        <button type="button" className="btn btn-primary welcome-cta" onClick={handleClose}>
          <Trans>Começar</Trans>
        </button>
      </div>
    </div>
  )
}
