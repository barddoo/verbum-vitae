import { Check, X } from 'lucide-react'
import { useState } from 'react'

const BTC_ADDRESS = 'bc1qs4n8h0z5perjqefgwjm8wfmzxm92sujum5uy3a'
const CHURCH_PIX_KEY = '10.703.989/0001-53'

interface DonateModalProps {
  onClose: () => void
}

type CopyTarget = 'btc' | 'church'

export function DonateModal({ onClose }: DonateModalProps) {
  const [copied, setCopied] = useState<CopyTarget | null>(null)

  function handleCopy(type: CopyTarget, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal donate-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Apoiar o projeto"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          <X size={18} aria-hidden />
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
            <button type="button" className="donate-copy-btn" onClick={() => handleCopy('btc', BTC_ADDRESS)} aria-live="polite">
              {copied === 'btc' ? <Check size={14} aria-hidden /> : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="donate-church">
          <span className="donate-church-label">Doe para a Igreja de Cristo</span>
          <p className="donate-church-hint">
            Se preferir, doe diretamente para uma igreja local. Abaixo, a chave Pix da minha — use a sua se quiser:
          </p>
          <div className="donate-btc-row">
            <code className="donate-btc-addr">{CHURCH_PIX_KEY}</code>
            <button type="button" className="donate-copy-btn" onClick={() => handleCopy('church', CHURCH_PIX_KEY)} aria-live="polite">
              {copied === 'church' ? <Check size={14} aria-hidden /> : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
