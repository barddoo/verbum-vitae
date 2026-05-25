import { useState } from 'react'

const BTC_ADDRESS = 'bc1qs4n8h0z5perjqefgwjm8wfmzxm92sujum5uy3a'

interface DonateModalProps {
  onClose: () => void
}

export function DonateModal({ onClose }: DonateModalProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(BTC_ADDRESS).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal donate-modal" role="dialog" aria-modal="true" aria-label="Apoiar o projeto" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>

        <div className="donate-header">
          <span className="donate-icon">₿</span>
          <h2 className="donate-title">Apoie este projeto</h2>
          <p className="donate-subtitle">Verbum Vitae é gratuito e de código aberto. Se foi útil pra você, considere uma doação.</p>
        </div>

        <div className="donate-btc">
          <span className="donate-btc-label">Bitcoin</span>
          <div className="donate-btc-row">
            <code className="donate-btc-addr">{BTC_ADDRESS}</code>
            <button type="button" className="donate-copy-btn" onClick={handleCopy} aria-live="polite">
              {copied ? '✓' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
