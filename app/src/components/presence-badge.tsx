import { usePresence } from '../lib/presence-context'

export function PresenceBadge() {
  const { count, isConnected } = usePresence()

  if (count === 0) return null

  return (
    <span className="presence-badge">
      <span className={`presence-dot ${isConnected ? 'online' : 'offline'}`} />
      {count} online
    </span>
  )
}
