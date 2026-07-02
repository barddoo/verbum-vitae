import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useSync } from '../lib/sync-context'

export function SyncErrorBanner() {
  const { error, syncNow, resetError } = useSync()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (error) {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(resetError, 8_000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [error, resetError])

  if (!error) return null

  return (
    <div className="sync-error-banner" role="alert">
      <span className="sync-error-banner-text">{error}</span>
      <button type="button" className="sync-error-banner-btn" onClick={() => syncNow()}>
        <Trans>Tentar novamente</Trans>
      </button>
      <button type="button" className="sync-error-banner-dismiss" onClick={resetError} aria-label={t`Fechar`}>
        <X size={12} aria-hidden />
      </button>
    </div>
  )
}
