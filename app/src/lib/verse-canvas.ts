import type { Background } from './verse-backgrounds'

export interface VerseImageOpts {
  verses: { ref: string; text: string }[]
  translation: string
  format: 'square' | 'story'
  background: Background
  customImage?: HTMLImageElement
  font: 'body' | 'display'
  align: 'left' | 'center'
  fontScale: number
  blur: number
  brightness: number
}

const FONT_BODY = '"Nunito Variable", system-ui, sans-serif'
const FONT_DISPLAY = '"Fraunces Variable", Georgia, serif'

const FONT_MAP = {
  body: FONT_BODY,
  display: FONT_DISPLAY,
} as const

const DIMENSIONS = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
} as const

const COLORS = {
  parchment: '#e8e6f0',
  gold: '#c9a84c',
  aged: '#7a7a9a',
}

const LAYOUT = {
  square: {
    paddingX: 100,
    baseFontSize: 44,
    lineHeightRatio: 1.5,
    refGap: 70,
    refSize: 28,
    dividerGap: 40,
    dividerWidth: 120,
    dividerHeight: 2,
    footerGap: 35,
    footerSize: 20,
    maxLines: 7,
  },
  story: {
    paddingX: 120,
    baseFontSize: 52,
    lineHeightRatio: 1.5,
    refGap: 100,
    refSize: 34,
    dividerGap: 60,
    dividerWidth: 160,
    dividerHeight: 2,
    footerGap: 50,
    footerSize: 24,
    maxLines: 15,
  },
} as const

async function ensureFontsLoaded(): Promise<void> {
  await document.fonts.load(`1em ${FONT_BODY}`)
  await document.fonts.load(`1em ${FONT_DISPLAY}`)
  await document.fonts.ready
}

function applyFilter(ctx: CanvasRenderingContext2D, blur: number, brightness: number): void {
  if (blur > 0 || brightness !== 1) {
    const parts: string[] = []
    if (blur > 0) parts.push(`blur(${blur}px)`)
    if (brightness !== 1) parts.push(`brightness(${brightness})`)
    ctx.filter = parts.join(' ')
  }
}

function clearFilter(ctx: CanvasRenderingContext2D): void {
  ctx.filter = 'none'
}

function drawGradientBackground(ctx: CanvasRenderingContext2D, width: number, height: number, stops: [string, string]): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, stops[0])
  gradient.addColorStop(1, stops[1])
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

function drawPhotoBackground(ctx: CanvasRenderingContext2D, width: number, height: number, image: HTMLImageElement): void {
  const imgW = image.naturalWidth || image.width
  const imgH = image.naturalHeight || image.height
  if (imgW === 0 || imgH === 0) return
  const scale = Math.max(width / imgW, height / imgH)
  const dw = imgW * scale
  const dh = imgH * scale
  const dx = (width - dw) / 2
  const dy = (height - dh) / 2
  ctx.drawImage(image, dx, dy, dw, dh)
}

function drawScrim(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.08)')
  gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.35)')
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)')
  gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.35)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.08)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  const words = text.split(/\s+/)
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

function wrapTextWithMaxLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines = wrapText(ctx, text, maxWidth)
  if (lines.length <= maxLines) return lines
  const truncated = lines.slice(0, maxLines)
  const last = truncated[maxLines - 1]
  const ellipsis = '…'
  const testLine = last + ellipsis
  if (ctx.measureText(testLine).width <= maxWidth) {
    truncated[maxLines - 1] = testLine
  } else {
    let trimmed = last
    while (ctx.measureText(trimmed + ellipsis).width > maxWidth && trimmed.length > 0) {
      trimmed = trimmed.slice(0, -1)
    }
    truncated[maxLines - 1] = trimmed + ellipsis
  }
  return truncated
}

function formatRef(verses: { ref: string }[], translation: string): string {
  if (verses.length === 0) return ''
  const abv = translation.toUpperCase()
  if (verses.length === 1) return `${verses[0].ref} (${abv})`
  const first = verses[0].ref
  const last = verses[verses.length - 1].ref

  const range = `${first} – ${last}`
  return `${range} (${abv})`
}

export async function renderVerseCard(canvas: HTMLCanvasElement, opts: VerseImageOpts): Promise<void> {
  const { verses, translation, format, background, customImage, font, align, fontScale, blur, brightness } = opts
  const dim = DIMENSIONS[format]
  const { width, height } = dim
  const ly = LAYOUT[format]

  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  await ensureFontsLoaded()

  // 1. Draw background
  if (background.kind === 'gradient') {
    drawGradientBackground(ctx, width, height, background.stops)
  } else if (background.kind === 'photo') {
    applyFilter(ctx, blur, brightness)
    drawPhotoBackground(ctx, width, height, customImage!)
    clearFilter(ctx)
  }

  // 2. Draw scrim
  drawScrim(ctx, width, height)

  // 3. Prepare text
  const fullText = verses.map((v) => v.text).join(' ')
  const bodyFamily = FONT_MAP[font]
  const fontSize = Math.round(ly.baseFontSize * fontScale)
  const lineHeight = Math.round(fontSize * ly.lineHeightRatio)
  const textWidth = width - ly.paddingX * 2

  ctx.font = `400 ${fontSize}px ${bodyFamily}`
  const textLines = wrapTextWithMaxLines(ctx, fullText, textWidth, ly.maxLines)

  // 4. Compute vertical layout
  const refLineHeight = Math.round(ly.refSize * 1.4)
  const footerLineHeight = Math.round(ly.footerSize * 1.4)

  const textBlockHeight = textLines.length * lineHeight
  const totalHeight = textBlockHeight + ly.refGap + refLineHeight + ly.dividerGap + ly.dividerHeight + ly.footerGap + footerLineHeight

  const startY = Math.round((height - totalHeight) / 2)

  // 5. Draw verse text
  ctx.fillStyle = COLORS.parchment
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 1

  const textX = align === 'center' ? Math.round(width / 2) : ly.paddingX
  ctx.textAlign = align === 'center' ? 'center' : 'left'

  for (let i = 0; i < textLines.length; i++) {
    const y = startY + i * lineHeight
    ctx.fillText(textLines[i], textX, y)
  }

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // 6. Draw reference
  const refY = startY + textBlockHeight + ly.refGap
  ctx.font = `350 ${ly.refSize}px ${FONT_DISPLAY}`
  ctx.fillStyle = COLORS.aged
  ctx.textAlign = 'center'
  ctx.fillText(formatRef(verses, translation), Math.round(width / 2), refY)

  // 7. Draw divider
  const dividerY = refY + refLineHeight + ly.dividerGap
  const dividerX = Math.round((width - ly.dividerWidth) / 2)
  ctx.fillStyle = COLORS.gold
  ctx.fillRect(dividerX, dividerY, ly.dividerWidth, ly.dividerHeight)

  // 8. Draw footer
  const footerY = dividerY + ly.dividerHeight + ly.footerGap
  ctx.font = `400 ${ly.footerSize}px ${FONT_DISPLAY}`
  ctx.fillStyle = COLORS.aged
  ctx.textAlign = 'center'
  ctx.fillText('Verbum Vitae', Math.round(width / 2), footerY)
}

export function toBlob(canvas: HTMLCanvasElement, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob returned null'))
      },
      'image/png',
      quality,
    )
  })
}
