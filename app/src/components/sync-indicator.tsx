import { t } from '@lingui/core/macro'
import { Cloud, RefreshCw } from 'lucide-react'
import { formatTimeAgo, useSync } from '../lib/sync-context'

export function SyncIndicator() {
  const { isSyncing, lastSynced, error, pendingCount, syncNow } = useSync()

  let tooltip = ''
  if (isSyncing) {
    tooltip = t`Sincronizando…`
  } else if (error) {
    tooltip = t`Erro ao sincronizar`
  } else if (lastSynced) {
    tooltip = t`Sincronizado há ${formatTimeAgo(lastSynced)}`
  } else {
    tooltip = t`Sincronizar`
  }

  let statusClass = 'sync-indicator'
  if (isSyncing) statusClass += ' is-syncing'
  if (error) statusClass += ' has-error'

  return (
    <>
      <span className={statusClass} title={tooltip}>
        {pendingCount > 0 && !isSyncing && <span className="sync-pending-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>}
        <Cloud size={14} strokeWidth={1.5} aria-hidden />
      </span>
      <button
        type="button"
        className="sync-now-btn"
        onClick={(e) => {
          e.currentTarget.blur()
          syncNow()
        }}
        disabled={isSyncing}
        aria-label={t`Sincronizar agora`}
        title={t`Sincronizar agora`}
      >
        <RefreshCw size={14} strokeWidth={1.5} className={isSyncing ? 'spin' : ''} aria-hidden />
      </button>
    </>
  )
}
