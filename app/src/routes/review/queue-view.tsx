import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { CardStateFilter, PracticeMode } from '../../hooks/use-review-queue'
import type { Collection, Progress } from '../../lib/db'
import { QueueFilters } from './queue-filters'

interface QueueViewProps {
  totalAll: number
  totalDue: number
  filterStatus: string
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
  practiceMode: PracticeMode
  setAndPersistMode: (m: PracticeMode) => void
  progressiveBlanks: boolean
  setProgressiveBlanks: (v: boolean) => void
  filteredProgress: Progress[]
  startReview: () => void
}
export function QueueView(props: QueueViewProps) {
  const {
    totalAll,
    totalDue,
    filterStatus,
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
    practiceMode,
    setAndPersistMode,
    progressiveBlanks,
    setProgressiveBlanks,
    filteredProgress,
    startReview,
  } = props

  const reviewCount = sessionLimit ? Math.min(filteredProgress.length, sessionLimit) : filteredProgress.length
  const noFiltersActive = filterVerseIds === null && filterCollectionId === null && filterCardState === 'all'
  return (
    <div className="page review-page">
      <div className="review-queue-hero">
        <span className="review-queue-big-num">{reviewCount}</span>
        <span className="review-queue-big-label">
          {totalAll === 0 ? t`nenhum texto memorizado` : reviewCount === 1 ? t`texto para revisar` : t`textos para revisar`}
        </span>
        {filterStatus === 'due' && noFiltersActive && totalAll > totalDue && totalAll > 0 && (
          <span className="review-queue-total-hint">{totalAll} total</span>
        )}
      </div>

      <QueueFilters
        filterVerseIds={filterVerseIds}
        setFilterVerseIds={setFilterVerseIds}
        collections={collections}
        collectionProgress={collectionProgress}
        filterCollectionId={filterCollectionId}
        setAndPersistCollectionId={setAndPersistCollectionId}
        filterCardState={filterCardState}
        setFilterCardState={setFilterCardState}
        sessionLimit={sessionLimit}
        setAndPersistLimit={setAndPersistLimit}
      />

      <div className="review-mode-grid">
        {(['fill-blank', 'flashcard', 'typing'] as PracticeMode[]).map((m) => (
          <button
            type="button"
            key={m}
            className={`review-mode-card ${practiceMode === m ? 'active' : ''}`}
            onClick={() => setAndPersistMode(m)}
          >
            <span className="review-mode-card-title">
              {m === 'flashcard' ? t`Flashcard` : m === 'fill-blank' ? t`Completar` : t`Digitar`}
            </span>
            <span className="review-mode-card-desc">
              {m === 'flashcard' ? t`Recite mentalmente` : m === 'fill-blank' ? t`Preencha lacunas` : t`Digite de memória`}
            </span>
          </button>
        ))}
      </div>

      {practiceMode === 'fill-blank' && (
        <label className="review-sub-toggle">
          <input
            type="checkbox"
            checked={progressiveBlanks}
            onChange={(e) => {
              setProgressiveBlanks(e.target.checked)
              localStorage.setItem('review_fill_blank_progressive', e.target.checked ? '1' : '0')
            }}
          />
          <span>
            <Trans>Palavra por palavra</Trans>
          </span>
          <span className="review-sub-toggle-hint">
            <Trans>Toque em cada lacuna para revelar uma palavra por vez</Trans>
          </span>
        </label>
      )}

      {totalAll === 0 ? (
        <>
          <button type="button" className="btn btn-primary btn-large btn-start" disabled>
            <Trans>Adicione textos para começar</Trans>
          </button>
          <p className="queue-empty-hint">
            <Trans>
              Vá para <a href="/browse">Textos</a> para adicionar itens.
            </Trans>
          </p>
        </>
      ) : filteredProgress.length === 0 && noFiltersActive ? (
        <div className="queue-up-to-date">
          <p className="queue-up-to-date-msg">
            <Trans>Você está em dia!</Trans>
          </p>
          <p className="queue-up-to-date-hint">
            <Trans>Volte amanhã para a próxima revisão.</Trans>
          </p>
        </div>
      ) : filteredProgress.length === 0 ? (
        <div className="queue-up-to-date">
          <p className="queue-up-to-date-msg">
            <Trans>Sem resultados</Trans>
          </p>
          <p className="queue-up-to-date-hint">
            <Trans>Nenhum texto encontrado com esses filtros.</Trans>
          </p>
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-large btn-start" onClick={startReview}>
          <Trans>Iniciar Revisão</Trans>
        </button>
      )}
    </div>
  )
}
