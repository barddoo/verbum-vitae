import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useSearch } from '@tanstack/react-router'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useReviewQueue } from '../hooks/use-review-queue'
import { useReviewSession } from '../hooks/use-review-session'
import { QueueView } from './review/queue-view'
import { SessionComplete } from './review/session-complete'
import { SessionView } from './review/session-view'

const loadingSpinner = (
  <div className="loading">
    <Trans>Carregando…</Trans>
  </div>
)

export function ReviewPage() {
  const { autostart } = useSearch({ from: '/review' })
  const autostartFired = useRef(false)
  const queue = useReviewQueue()
  const { phase, setPhase, loading, totalAll, totalDue, filterStatus, filteredProgress } = queue
  const session = useReviewSession({ allProgress: queue.allProgress, filteredProgress, sessionLimit: queue.sessionLimit, setPhase })
  const {
    items,
    currentIndex,
    completed,
    sessionLoading,
    gradeHistory,
    skipped,
    sessionOffsetRef,
    startReview,
    handleGrade,
    handleSkip,
    goBack,
    resetSessionStats,
  } = session

  useLayoutEffect(() => {
    if (phase === 'session') {
      document.body.classList.add('is-reviewing')
    } else {
      document.body.classList.remove('is-reviewing')
    }
    return () => document.body.classList.remove('is-reviewing')
  }, [phase])

  useEffect(() => {
    if (!loading && autostart === '1' && totalAll > 0 && phase === 'queue' && !autostartFired.current) {
      autostartFired.current = true
      startReview()
    }
  }, [loading, autostart, totalAll, phase, startReview])

  if (loading || sessionLoading) return <div className="page">{loadingSpinner}</div>

  if (phase === 'queue') {
    return (
      <QueueView
        totalAll={totalAll}
        totalDue={totalDue}
        filterStatus={filterStatus}
        filterVerseIds={queue.filterVerseIds}
        setFilterVerseIds={queue.setFilterVerseIds}
        collections={queue.collections}
        collectionProgress={queue.collectionProgress}
        filterCollectionId={queue.filterCollectionId}
        setAndPersistCollectionId={queue.setAndPersistCollectionId}
        filterCardState={queue.filterCardState}
        setFilterCardState={queue.setFilterCardState}
        sessionLimit={queue.sessionLimit}
        setAndPersistLimit={queue.setAndPersistLimit}
        practiceMode={queue.practiceMode}
        setAndPersistMode={queue.setAndPersistMode}
        progressiveBlanks={queue.progressiveBlanks}
        setProgressiveBlanks={queue.setProgressiveBlanks}
        filteredProgress={filteredProgress}
        startReview={startReview}
      />
    )
  }

  if (items.length === 0) {
    return (
      <div className="page review-page">
        <div className="empty-state">
          <h2>
            <Trans>Nada para revisar!</Trans>
          </h2>
          <p>{filterStatus === 'due' ? t`Todos os textos estão em dia.` : t`Nenhum texto encontrado.`}</p>
          <div className="empty-actions">
            <button type="button" className="btn btn-secondary" onClick={goBack}>
              <Trans>Voltar</Trans>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (currentIndex >= items.length) {
    return (
      <SessionComplete
        completed={completed}
        skippedCount={skipped}
        gradeHistory={gradeHistory}
        lastVerse={
          items.length > 0
            ? {
                ref: items[items.length - 1].reference,
                text: items[items.length - 1].verseText,
                translation: items[items.length - 1].translation,
              }
            : undefined
        }
        remainingCount={Math.max(0, filteredProgress.length - sessionOffsetRef.current - items.length)}
        onGoBack={goBack}
        onNewSession={resetSessionStats}
        onContinue={() => {
          sessionOffsetRef.current += items.length
          startReview()
        }}
      />
    )
  }

  return (
    <SessionView
      items={items}
      currentIndex={currentIndex}
      completed={completed}
      practiceMode={queue.practiceMode}
      setAndPersistMode={queue.setAndPersistMode}
      progressiveBlanks={queue.progressiveBlanks}
      goBack={goBack}
      handleSkip={handleSkip}
      handleGrade={handleGrade}
    />
  )
}
