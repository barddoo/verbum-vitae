import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { shareImageBlob } from '../../lib/sharing'
import { BACKGROUNDS, type Background } from '../../lib/verse-backgrounds'
import { renderVerseCard, toBlob } from '../../lib/verse-canvas'
import { BackgroundCarousel } from './background-carousel'
import { VerseImageControls } from './verse-image-controls'

interface VerseImageModalProps {
  open: boolean
  onClose: () => void
  verses: { ref: string; text: string }[]
  translation: string
  bookName: string
}

const DEFAULT_FORMAT: 'square' | 'story' = 'story'
const PREVIEW_DIM = { square: 540, story: 303 } as const

export function VerseImageModal({ open, onClose, verses, translation, bookName }: VerseImageModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTokenRef = useRef(0)
  const customUrlRef = useRef<string | null>(null)
  const [background, setBackground] = useState<Background>(BACKGROUNDS[0])
  const [customImage, setCustomImage] = useState<HTMLImageElement | undefined>(undefined)
  const [format, setFormat] = useState<'square' | 'story'>(DEFAULT_FORMAT)
  const [font, setFont] = useState<'body' | 'display'>('body')
  const [align, setAlign] = useState<'left' | 'center'>('center')
  const [fontScale, setFontScale] = useState(1)
  const [blur, setBlur] = useState(4)
  const [brightness, setBrightness] = useState(0.9)
  const [busy, setBusy] = useState(false)

  const showFilters = background.kind === 'photo'

  const redraw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const token = ++renderTokenRef.current
    try {
      await renderVerseCard(canvas, {
        verses,
        translation,
        format,
        background,
        customImage,
        font,
        align,
        fontScale,
        blur: showFilters ? blur : 0,
        brightness: showFilters ? brightness : 1,
      })
    } catch (err) {
      if (token === renderTokenRef.current) console.error('verse-image render failed', err)
    }
  }, [verses, translation, format, background, customImage, font, align, fontScale, blur, brightness, showFilters])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(redraw, 60)
    return () => clearTimeout(t)
  }, [open, redraw])

  useEffect(() => {
    if (!open) return
    if (background.kind !== 'photo') return
    const img = new Image()
    img.onload = () => setCustomImage(img)
    img.onerror = () => setCustomImage(undefined)
    img.src = background.full
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [open, background.id])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSelect = useCallback((bg: Background, custom?: HTMLImageElement) => {
    setBackground(bg)
    if (custom) {
      setCustomImage(custom)
      if (
        bg.kind === 'photo' &&
        bg.id === 'custom' &&
        bg.full.startsWith('blob:') &&
        customUrlRef.current &&
        customUrlRef.current !== bg.full
      ) {
        URL.revokeObjectURL(customUrlRef.current)
      }
      if (bg.kind === 'photo' && bg.id === 'custom') customUrlRef.current = bg.full
    } else if (bg.kind === 'photo') {
      const img = new Image()
      img.onload = () => setCustomImage(img)
      img.onerror = () => setCustomImage(undefined)
      img.src = bg.full
    } else {
      setCustomImage(undefined)
    }
  }, [])

  async function handleShare() {
    setBusy(true)
    try {
      const canvas = canvasRef.current
      if (!canvas) return
      await renderVerseCard(canvas, {
        verses,
        translation,
        format,
        background,
        customImage,
        font,
        align,
        fontScale,
        blur: showFilters ? blur : 0,
        brightness: showFilters ? brightness : 1,
      })
      const blob = await toBlob(canvas)
      await shareImageBlob(blob, verses[0]?.ref ?? bookName)
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    setBusy(true)
    try {
      const canvas = canvasRef.current
      if (!canvas) return
      await renderVerseCard(canvas, {
        verses,
        translation,
        format,
        background,
        customImage,
        font,
        align,
        fontScale,
        blur: showFilters ? blur : 0,
        brightness: showFilters ? brightness : 1,
      })
      const blob = await toBlob(canvas)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'versiculo.png'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  const previewW = PREVIEW_DIM[format]
  const previewH = format === 'square' ? previewW : Math.round(previewW * (1920 / 1080))
  const selectedId = useMemo(() => (background.id === 'custom' && customImage ? 'custom' : background.id), [background, customImage])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card verse-image-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="verse-image-title"
      >
        <div className="modal-header">
          <h2 id="verse-image-title" className="modal-title">
            <Trans>Criar Imagem</Trans>
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t`Fechar`}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="verse-image-preview-frame">
          <canvas
            ref={canvasRef}
            className="verse-image-preview-canvas"
            width={previewW}
            height={previewH}
            style={{ aspectRatio: `${previewW} / ${previewH}` }}
            aria-label={t`Pré-visualização do versículo`}
          />
        </div>

        <VerseImageControls
          format={format}
          font={font}
          align={align}
          fontScale={fontScale}
          blur={blur}
          brightness={brightness}
          showFilters={showFilters}
          onChange={(next) => {
            if (next.format !== undefined) setFormat(next.format)
            if (next.font !== undefined) setFont(next.font)
            if (next.align !== undefined) setAlign(next.align)
            if (next.fontScale !== undefined) setFontScale(next.fontScale)
            if (next.blur !== undefined) setBlur(next.blur)
            if (next.brightness !== undefined) setBrightness(next.brightness)
          }}
        />

        <BackgroundCarousel backgrounds={BACKGROUNDS} selectedId={selectedId} onSelect={handleSelect} />

        <div className="modal-actions verse-image-actions">
          <button type="button" className="btn btn-secondary" onClick={handleSave} disabled={busy}>
            <Trans>Salvar imagem</Trans>
          </button>
          <button type="button" className="btn btn-primary" onClick={handleShare} disabled={busy}>
            {busy ? t`Preparando…` : t`Compartilhar`}
          </button>
        </div>
      </div>
    </div>
  )
}
