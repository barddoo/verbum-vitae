import type { Collection } from '../../lib/db'
import { type CardStateFilter, LIMIT_OPTIONS, PRACTICE_MODES, type PracticeMode } from './review-types'

interface ReviewQueueProps {
  reviewCount: number
  totalAll: number
  filterStatus: 'due' | 'all'
  noFiltersActive: boolean
  /** Show "N total" hint when only some of the memorized verses are due. */
  showTotalHint: boolean
  filteredProgressLength: number
  filterVerseIds: string[] | null
  hasCollections: boolean
  collections: Collection[]
  collectionProgress: Map<number, { total: number; due: number }>
  filterCollectionId: number | null
  filterCardState: CardStateFilter
  sessionLimit: number | null
  shuffle: boolean
  practiceMode: PracticeMode
  progressive: boolean
  onClearPinned: () => void
  onCollectionChange: (id: number | null) => void
  onStateChange: (s: CardStateFilter) => void
  onLimitChange: (limit: number | null) => void
  onShuffleChange: () => void
  onModeChange: (m: PracticeMode) => void
  onProgressiveChange: (checked: boolean) => void
  onStart: () => void
}

const STATE_OPTIONS: [CardStateFilter, string][] = [
  ['all', 'Todos'],
  ['new', 'Novos'],
  ['learning', 'Aprendendo'],
  ['review', 'Revisando'],
]

export function ReviewQueue(props: ReviewQueueProps) {
  const {
    reviewCount,
    totalAll,
    filterStatus,
    noFiltersActive,
    showTotalHint,
    filteredProgressLength,
    filterVerseIds,
    hasCollections,
    collections,
    collectionProgress,
    filterCollectionId,
    filterCardState,
    sessionLimit,
    shuffle,
    practiceMode,
    progressive,
  } = props

  return (
    <div className="page review-page">
      <div className="review-queue-hero">
        <span className="review-queue-big-num">{reviewCount}</span>
        <span className="review-queue-big-label">
          {totalAll === 0 ? 'nenhum texto memorizado' : reviewCount === 1 ? 'texto para revisar' : 'textos para revisar'}
        </span>
        {showTotalHint && <span className="review-queue-total-hint">{totalAll} total</span>}
      </div>

      {filterVerseIds !== null ? (
        <div className="review-pinned-filter">
          <span className="review-pinned-label">
            {filterVerseIds.length} {filterVerseIds.length === 1 ? 'versículo selecionado' : 'versículos selecionados'}
          </span>
          <button type="button" className="review-pinned-clear" onClick={props.onClearPinned} aria-label="Limpar seleção">
            ×
          </button>
        </div>
      ) : (
        <>
          {hasCollections && (
            <div className="review-filter-section">
              <span className="review-filter-label">Coleção</span>
              <div className="source-picker-options">
                <button
                  type="button"
                  className={`source-chip ${filterCollectionId === null ? 'active' : ''}`}
                  onClick={() => props.onCollectionChange(null)}
                >
                  Todas
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
                        onClick={() => props.onCollectionChange(filterCollectionId === c.id ? null : c.id!)}
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
            <span className="review-filter-label">Estado</span>
            <div className="review-filter-toggle">
              {STATE_OPTIONS.map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`filter-toggle-btn ${filterCardState === val ? 'active' : ''}`}
                  onClick={() => props.onStateChange(val)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="review-filter-section">
            <span className="review-filter-label">Limite por sessão</span>
            <div className="review-filter-toggle">
              {LIMIT_OPTIONS.map((limit) => (
                <button
                  key={limit}
                  type="button"
                  className={`filter-toggle-btn ${sessionLimit === limit ? 'active' : ''}`}
                  onClick={() => props.onLimitChange(limit)}
                >
                  {limit}
                </button>
              ))}
              <button
                type="button"
                className={`filter-toggle-btn ${sessionLimit === null ? 'active' : ''}`}
                onClick={() => props.onLimitChange(null)}
              >
                Todos
              </button>
            </div>
            <label className="review-sub-toggle">
              <input type="checkbox" checked={shuffle} onChange={props.onShuffleChange} />
              <span>Embaralhar ordem</span>
              <span className="review-sub-toggle-hint">evita decorar a posição dos textos</span>
            </label>
          </div>
        </>
      )}

      <div className="review-mode-grid">
        {PRACTICE_MODES.map(({ value, title, desc }) => (
          <button
            type="button"
            key={value}
            className={`review-mode-card ${practiceMode === value ? 'active' : ''}`}
            onClick={() => props.onModeChange(value)}
          >
            <span className="review-mode-card-title">{title}</span>
            <span className="review-mode-card-desc">{desc}</span>
          </button>
        ))}
      </div>

      {practiceMode === 'fill-blank' && (
        <label className="review-sub-toggle">
          <input type="checkbox" checked={progressive} onChange={(e) => props.onProgressiveChange(e.target.checked)} />
          <span>Palavra por palavra</span>
          <span className="review-sub-toggle-hint">Toque em cada lacuna para revelar uma palavra por vez</span>
        </label>
      )}

      {totalAll === 0 ? (
        <>
          <button type="button" className="btn btn-primary btn-large btn-start" disabled>
            Adicione textos para começar
          </button>
          <p className="queue-empty-hint">
            Vá para <a href="/browse">Textos</a> para adicionar itens.
          </p>
        </>
      ) : filteredProgressLength === 0 && noFiltersActive ? (
        <div className="queue-up-to-date">
          <p className="queue-up-to-date-msg">Você está em dia!</p>
          <p className="queue-up-to-date-hint">Volte amanhã para a próxima revisão.</p>
        </div>
      ) : filteredProgressLength === 0 ? (
        <div className="queue-up-to-date">
          <p className="queue-up-to-date-msg">Sem resultados</p>
          <p className="queue-up-to-date-hint">Nenhum texto encontrado com esses filtros.</p>
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-large btn-start" onClick={props.onStart}>
          Iniciar Revisão
        </button>
      )}
    </div>
  )
}
