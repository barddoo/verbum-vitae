import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'

export function SelectionBar({
  count,
  previewText,
  onClear,
  onMemorize,
  onShareImage,
  actionLabel,
}: {
  count: number
  previewText: string
  onClear: () => void
  onMemorize: () => void
  onShareImage?: () => void
  actionLabel?: string
}) {
  if (count === 0) return null

  return (
    <div className="selection-bar">
      <div className="selection-bar-info">
        <span className="selection-bar-count">{plural(count, { one: '# selecionado', other: '# selecionados' })}</span>
        <span className="selection-bar-preview">
          &ldquo;{previewText.slice(0, 60)}
          {previewText.length > 60 ? '…' : ''}&rdquo;
        </span>
      </div>
      <div className="selection-bar-actions">
        <button type="button" className="btn btn-sm btn-secondary" onClick={onClear}>
          <Trans>Limpar</Trans>
        </button>
        {onShareImage && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={onShareImage}>
            <Trans>Imagem</Trans>
          </button>
        )}
        <button type="button" className="btn btn-sm btn-primary" onClick={onMemorize}>
          {actionLabel || t`Memorizar`}
        </button>
      </div>
    </div>
  )
}
