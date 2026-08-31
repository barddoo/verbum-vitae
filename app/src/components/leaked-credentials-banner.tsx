import { X } from 'lucide-react'
import { useAuth } from '../lib/auth'

export function LeakedCredentialsBanner() {
  const { leakedCredentials, clearLeakedCredentials } = useAuth()

  if (!leakedCredentials) return null

  return (
    <div className="leaked-credentials-banner" role="alert">
      <span className="leaked-credentials-banner-text">
        Sua senha foi encontrada em um vazamento de dados. Use uma senha única, diferente das suas outras contas.
      </span>
      <button type="button" className="leaked-credentials-banner-dismiss" onClick={clearLeakedCredentials} aria-label="Fechar">
        <X size={12} aria-hidden />
      </button>
    </div>
  )
}
