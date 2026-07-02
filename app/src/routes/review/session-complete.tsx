import type { MessageDescriptor } from '@lingui/core'
import { msg, t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import { VerseImageModal } from '../../components/verse-image/verse-image-modal'
import { shareSession } from '../../lib/sharing'
import type { Grade } from '../../lib/srs'

const TIPS: MessageDescriptor[] = [
  msg`Leia o contexto antes de memorizar — o parágrafo ao redor ancora o significado das palavras.`,
  msg`Leia o versículo em voz alta. Vocalizar ativa a memória auditiva e aumenta a retenção em ~50%.`,
  msg`Escreva o versículo à mão uma vez quando começar a memorizá-lo. O ato de escrever cria outro caminho de memória.`,
  msg`Avalie com honestidade. Dizer "Fácil" quando não está fluente engana o algoritmo e você esquece mais rápido.`,
  msg`Associe o versículo a uma situação concreta da sua vida. Memória emocional é muito mais durável.`,
  msg`Consistência supera intensidade — 5 versículos por dia superam 35 numa sessão semanal. Não pule dias.`,
  msg`Recite o versículo em voz alta, como se estivesse ensinando alguém. O feedback auditivo fixa mais.`,
  msg`Adicione 1–2 versículos novos por vez, nunca muitos de uma vez. O acúmulo rápido leva ao abandono.`,
  msg`Medite no significado do versículo. Entender o que ele diz torna a memorização mais rápida e a retenção mais longa.`,
  msg`Manhã é o melhor momento para revisar — aproveite a consolidação da memória que ocorre durante o sono.`,
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
  const { _ } = useLingui()
  const gradeCounts = useMemo(() => [1, 2, 3, 4].map((r) => gradeHistory.filter((g) => g === r).length), [gradeHistory])

  const [tipMsg] = useState<MessageDescriptor>(() => {
    const stored = parseInt(localStorage.getItem('session_tip_index') ?? '0', 10)
    const index = Number.isNaN(stored) ? 0 : stored % TIPS.length
    localStorage.setItem('session_tip_index', String((index + 1) % TIPS.length))
    return TIPS[index]
  })

  const [showImageModal, setShowImageModal] = useState(false)

  const gradeLabels = ['', t`Esqueci`, t`Difícil`, t`Ok`, t`Fácil`]

  function handleShare() {
    shareSession(completed)
  }

  return (
    <div className="page review-page">
      <div className="session-complete">
        <h2>
          <Trans>Sessão concluída!</Trans>
        </h2>
        <p className="session-complete-count">
          {completed} {completed === 1 ? t`texto revisado` : t`textos revisados`}
          {skippedCount > 0 && (
            <span className="session-skipped-count">
              {' '}
              · {skippedCount} {skippedCount !== 1 ? t`pulados` : t`pulado`}
            </span>
          )}
        </p>
        {completed > 0 && (
          <div className="session-grade-breakdown">
            {[1, 2, 3, 4].map((r, i) => (
              <div key={r} className={`grade-breakdown-item grade-breakdown-${r}`}>
                <span>{gradeLabels[r]}</span>
                <span>{gradeCounts[i]}</span>
              </div>
            ))}
          </div>
        )}
        {completed > 0 && (
          <div className="session-tip">
            <span className="session-tip-label">
              <Trans>💡 Dica</Trans>
            </span>
            <p className="session-tip-text">{_(tipMsg)}</p>
          </div>
        )}
        <div className="session-complete-actions">
          {remainingCount > 0 ? (
            <button type="button" className="btn btn-primary" onClick={onContinue}>
              <Trans>Próxima sessão ({remainingCount})</Trans>
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onNewSession}>
              <Trans>Nova Sessão</Trans>
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onGoBack}>
            <Trans>Voltar</Trans>
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleShare}>
            <Trans>Compartilhar</Trans>
          </button>
          {lastVerse && (
            <button type="button" className="btn btn-secondary" onClick={() => setShowImageModal(true)}>
              <Trans>Compartilhar imagem</Trans>
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
