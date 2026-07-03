import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { CardStateFilter } from '../../hooks/use-review-queue'
import type { Collection } from '../../lib/db'

const LIMIT_OPTIONS = [5, 10, 20, 50] as const

export interface QueueFiltersProps {
  filterVerseIds: string[] | null
  setFilterVerseIds: (v: string[] | null) => void
  collections: Collection[] | undefined
  collectionProgress: Map<number, { total: number; due: number }>
  filterCollectionId: number | null
  setAndPersistCollectionId: (id: number | null) => void
  filterCardState: CardStateFilter
  setFilterCardState: (v: CardStateFilter) => void
  sessionLimit: number | null
  setAndPersistLimit: (limit: number | null) => void
}

export function QueueFilters({
  filterVerseIds,
  setFilterVerseIds,
  collections,
  collectionProgress,
  filterCollectionId,
  setAndPersistCollectionId,
  filterCardState,
  setFilterCardState,
  sessionLimit,
  setAndPersistLimit,
}: QueueFiltersProps) {
  const hasCollections = collections && collections.length > 0

  if (filterVerseIds !== null) {
    return (
      <div className="review-pinned-filter">
        <span className="review-pinned-label">
          {filterVerseIds.length} {filterVerseIds.length === 1 ? t`versículo selecionado` : t`versículos selecionados`}
        </span>
        <button type="button" className="review-pinned-clear" onClick={() => setFilterVerseIds(null)} aria-label={t`Limpar seleção`}>
          ×
        </button>
      </div>
    )
  }

  return (
    <>
      {hasCollections && (
        <div className="review-filter-section">
          <span className="review-filter-label">
            <Trans>Coleção</Trans>
          </span>
          <div className="source-picker-options">
            <button
              type="button"
              className={`source-chip ${filterCollectionId === null ? 'active' : ''}`}
              onClick={() => setAndPersistCollectionId(null)}
            >
              <Trans>Todas</Trans>
            </button>
            {collections
              .filter((c) => c.isBuiltin === 0 || (collectionProgress.get(c.id!)?.total ?? 0) > 0)
              .map((c) => {
                const due = collectionProgress.get(c.id!)?.due ?? 0
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={`source-chip ${filterCollectionId === c.id ? 'active' : ''}`}
                    onClick={() => setAndPersistCollectionId(filterCollectionId === c.id ? null : c.id!)}
                  >
                    {c.icon ? `${c.icon} ${c.name}` : c.name}
                    {due > 0 && <span className="source-chip-count">{due}</span>}
                  </button>
                )
              })}
          </div>
        </div>
      )}

      <div className="review-filter-section">
        <span className="review-filter-label">
          <Trans>Estado</Trans>
        </span>
        <div className="review-filter-toggle">
          {(
            [
              ['all', t`Todos`],
              ['new', t`Novos`],
              ['learning', t`Aprendendo`],
              ['review', t`Revisando`],
            ] as [CardStateFilter, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={`filter-toggle-btn ${filterCardState === val ? 'active' : ''}`}
              onClick={() => setFilterCardState(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="review-filter-section">
        <span className="review-filter-label">
          <Trans>Limite por sessão</Trans>
        </span>
        <div className="review-filter-toggle">
          {LIMIT_OPTIONS.map((limit) => (
            <button
              key={limit}
              type="button"
              className={`filter-toggle-btn ${sessionLimit === limit ? 'active' : ''}`}
              onClick={() => setAndPersistLimit(limit)}
            >
              {limit}
            </button>
          ))}
          <button
            type="button"
            className={`filter-toggle-btn ${sessionLimit === null ? 'active' : ''}`}
            onClick={() => setAndPersistLimit(null)}
          >
            <Trans>Todos</Trans>
          </button>
        </div>
      </div>
    </>
  )
}
