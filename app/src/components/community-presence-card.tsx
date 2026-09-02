import { useMemo } from 'react'
import { usePresence } from '../lib/presence-context'
import { shareVerse } from '../lib/sharing'

/** Live "people memorizing now" card shown on home. Copy adapts to whether the user has text. */
export function CommunityPresenceCard({ memorized }: { memorized: boolean }) {
  const { count: presenceCount } = usePresence()
  const nf = useMemo(() => new Intl.NumberFormat('pt-BR'), [])
  const show = presenceCount > 0
  const encourage = show
    ? memorized
      ? 'Continue assim!'
      : 'Junte-se a eles!'
    : memorized
      ? 'Continue memorizando!'
      : 'Seja o primeiro a memorizar hoje!'

  return (
    <div className="community-presence-card" aria-live="polite">
      {show ? (
        <>
          <span className="community-presence-main">
            <span className="community-presence-count">{nf.format(presenceCount)}</span>
            <span className="community-presence-unit">{presenceCount === 1 ? 'pessoa' : 'pessoas'}</span>
          </span>
          <span className="community-presence-label">memorizando agora</span>
          <span className="community-presence-encourage">{encourage}</span>
        </>
      ) : (
        <span className="community-presence-encourage">{encourage}</span>
      )}
      <button type="button" className="btn btn-sm btn-secondary" onClick={() => shareVerse()}>
        Compartilhar
      </button>
    </div>
  )
}
