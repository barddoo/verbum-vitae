import { NotificationType } from '@capacitor/haptics'
import { useEffect, useMemo, useState } from 'react'
import { VerseImageModal } from '../../components/verse-image/verse-image-modal'
import { hapticNotify } from '../../lib/haptics'
import { shareSession } from '../../lib/sharing'
import type { Grade } from '../../lib/srs'

const TIPS = [
  'Leia o contexto antes de memorizar — o parágrafo ao redor ancora o significado das palavras.',
  'Leia o versículo em voz alta. Vocalizar ativa a memória auditiva e aumenta a retenção em ~50%.',
  'Escreva o versículo à mão uma vez quando começar a memorizá-lo. O ato de escrever cria outro caminho de memória.',
  'Avalie com honestidade. Dizer "Fácil" quando não está fluente engana o algoritmo e você esquece mais rápido.',
  'Associe o versículo a uma situação concreta da sua vida. Memória emocional é muito mais durável.',
  'Consistência supera intensidade — 5 versículos por dia superam 35 numa sessão semanal. Não pule dias.',
  'Recite o versículo em voz alta, como se estivesse ensinando alguém. O feedback auditivo fixa mais.',
  'Adicione 1–2 versículos novos por vez, nunca muitos de uma vez. O acúmulo rápido leva ao abandono.',
  'Medite no significado do versículo. Entender o que ele diz torna a memorização mais rápida e a retenção mais longa.',
  'Manhã é o melhor momento para revisar — aproveite a consolidação da memória que ocorre durante o sono.',
]

export function SessionComplete({
  completed,
  skippedCount,
  gradeHistory,
  lastVerse,
  remainingCount,
  onGoBack,
  onNewSession,
  onContinue,
}: {
  completed: number
  skippedCount: number
  gradeHistory: Grade[]
  lastVerse?: { ref: string; text: string; translation: string }
  remainingCount: number
  onGoBack: () => void
  onNewSession: () => void
  onContinue: () => void
}) {
  const gradeCounts = useMemo(() => [1, 2, 3, 4].map((r) => gradeHistory.filter((g) => g === r).length), [gradeHistory])

  const [tip] = useState(() => {
    const stored = parseInt(localStorage.getItem('session_tip_index') ?? '0', 10)
    const index = Number.isNaN(stored) ? 0 : stored % TIPS.length
    localStorage.setItem('session_tip_index', String((index + 1) % TIPS.length))
    return TIPS[index]
  })

  const [showImageModal, setShowImageModal] = useState(false)

  useEffect(() => {
    if (completed > 0) hapticNotify(NotificationType.Success)
  }, [completed])

  function handleShare() {
    shareSession(completed)
  }

  return (
    <div className="page review-page">
      <div className="session-complete">
        <h2>Sessão concluída!</h2>
        <p className="session-complete-count">
          {completed} {completed === 1 ? 'texto revisado' : 'textos revisados'}
          {skippedCount > 0 && (
            <span className="session-skipped-count">
              {' '}
              · {skippedCount} pulado{skippedCount !== 1 ? 's' : ''}
            </span>
          )}
        </p>
        {completed > 0 && (
          <div className="session-grade-breakdown">
            {[1, 2, 3, 4].map((r, i) => (
              <div key={r} className={`grade-breakdown-item grade-breakdown-${r}`}>
                <span>{['', 'Esqueci', 'Difícil', 'Ok', 'Fácil'][r]}</span>
                <span>{gradeCounts[i]}</span>
              </div>
            ))}
          </div>
        )}
        {completed > 0 && (
          <div className="session-tip">
            <span className="session-tip-label">💡 Dica</span>
            <p className="session-tip-text">{tip}</p>
          </div>
        )}
        <div className="session-complete-actions">
          {remainingCount > 0 ? (
            <button type="button" className="btn btn-primary" onClick={onContinue}>
              Próxima sessão ({remainingCount})
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onNewSession}>
              Nova Sessão
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onGoBack}>
            Voltar
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleShare}>
            Compartilhar
          </button>
          {lastVerse && (
            <button type="button" className="btn btn-secondary" onClick={() => setShowImageModal(true)}>
              Compartilhar imagem
            </button>
          )}
        </div>
      </div>
      {lastVerse && (
        <VerseImageModal
          open={showImageModal}
          onClose={() => setShowImageModal(false)}
          verses={[{ ref: lastVerse.ref, text: lastVerse.text }]}
          translation={lastVerse.translation}
          bookName={lastVerse.ref}
        />
      )}
    </div>
  )
}
