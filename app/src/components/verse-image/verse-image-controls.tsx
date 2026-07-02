import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'

interface ControlsProps {
  format: 'square' | 'story'
  font: 'body' | 'display'
  align: 'left' | 'center'
  fontScale: number
  blur: number
  brightness: number
  showFilters: boolean
  onChange: (next: Partial<ControlsProps>) => void
}

export function VerseImageControls({ format, font, align, fontScale, blur, brightness, showFilters, onChange }: ControlsProps) {
  return (
    <div className="verse-image-controls">
      <div className="control-group">
        <span className="control-label">
          <Trans>Formato</Trans>
        </span>
        <fieldset className="segmented" aria-label={t`Formato`}>
          <button
            type="button"
            className={`segmented-btn ${format === 'square' ? 'active' : ''}`}
            onClick={() => onChange({ format: 'square' })}
            aria-pressed={format === 'square'}
          >
            <Trans>Quadrado</Trans>
          </button>
          <button
            type="button"
            className={`segmented-btn ${format === 'story' ? 'active' : ''}`}
            onClick={() => onChange({ format: 'story' })}
            aria-pressed={format === 'story'}
          >
            Story
          </button>
        </fieldset>
      </div>

      <div className="control-group">
        <span className="control-label">
          <Trans>Fonte</Trans>
        </span>
        <fieldset className="segmented" aria-label={t`Fonte`}>
          <button
            type="button"
            className={`segmented-btn ${font === 'body' ? 'active' : ''}`}
            onClick={() => onChange({ font: 'body' })}
            aria-pressed={font === 'body'}
          >
            Nunito
          </button>
          <button
            type="button"
            className={`segmented-btn ${font === 'display' ? 'active' : ''}`}
            onClick={() => onChange({ font: 'display' })}
            aria-pressed={font === 'display'}
          >
            Fraunces
          </button>
        </fieldset>
      </div>

      <div className="control-group">
        <span className="control-label">
          <Trans>Alinhamento</Trans>
        </span>
        <fieldset className="segmented" aria-label={t`Alinhamento`}>
          <button
            type="button"
            className={`segmented-btn ${align === 'left' ? 'active' : ''}`}
            onClick={() => onChange({ align: 'left' })}
            aria-pressed={align === 'left'}
          >
            <Trans>Esq</Trans>
          </button>
          <button
            type="button"
            className={`segmented-btn ${align === 'center' ? 'active' : ''}`}
            onClick={() => onChange({ align: 'center' })}
            aria-pressed={align === 'center'}
          >
            <Trans>Centro</Trans>
          </button>
        </fieldset>
      </div>

      <div className="control-group">
        <label className="control-label" htmlFor="verse-image-size">
          <Trans>Tamanho do texto</Trans>
        </label>
        <input
          id="verse-image-size"
          type="range"
          className="control-slider"
          min="0.7"
          max="1.4"
          step="0.05"
          value={fontScale}
          onChange={(e) => onChange({ fontScale: Number(e.target.value) })}
          aria-label={t`Tamanho do texto`}
        />
      </div>

      {showFilters && (
        <>
          <div className="control-group">
            <label className="control-label" htmlFor="verse-image-blur">
              <Trans>Desfoque</Trans>
            </label>
            <input
              id="verse-image-blur"
              type="range"
              className="control-slider"
              min="0"
              max="20"
              step="1"
              value={blur}
              onChange={(e) => onChange({ blur: Number(e.target.value) })}
              aria-label={t`Desfoque do fundo`}
            />
          </div>

          <div className="control-group">
            <label className="control-label" htmlFor="verse-image-brightness">
              <Trans>Brilho</Trans>
            </label>
            <input
              id="verse-image-brightness"
              type="range"
              className="control-slider"
              min="0.5"
              max="1.5"
              step="0.05"
              value={brightness}
              onChange={(e) => onChange({ brightness: Number(e.target.value) })}
              aria-label={t`Brilho do fundo`}
            />
          </div>
        </>
      )}
    </div>
  )
}
