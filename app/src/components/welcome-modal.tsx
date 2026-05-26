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
            Bem-vindo ao Verbum Vitae
          </h2>
          <p className="welcome-subtitle">Obrigado por usar este app. Que a Palavra de Deus habite ricamente em você.</p>
        </div>

        <blockquote className="welcome-verse">
          <p className="welcome-verse-text">Guardei no coração a tua palavra para não pecar contra ti.</p>
          <cite className="welcome-verse-ref">Salmos 119:11 — NVI</cite>
        </blockquote>

        <button type="button" className="btn btn-primary welcome-cta" onClick={handleClose}>
          Começar
        </button>
      </div>
    </div>
  )
}
