// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shareImageBlob } from './sharing'

beforeEach(() => {
  ;(navigator as unknown as Record<string, unknown>).canShare = undefined
  ;(navigator as unknown as Record<string, unknown>).share = undefined
})

describe('shareImageBlob', () => {
  it('uses download fallback when navigator.canShare is unavailable', async () => {
    const blob = new Blob(['x'], { type: 'image/png' })
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL')
    const anchorClicks: HTMLAnchorElement[] = []
    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
      const el = origCreate(tag, options) as HTMLAnchorElement
      if (tag === 'a') anchorClicks.push(el)
      return el
    })

    await shareImageBlob(blob, 'Test')

    expect(createUrl).toHaveBeenCalledWith(blob)
    expect(anchorClicks).toHaveLength(1)
    expect(anchorClicks[0].download).toBe('versiculo.png')
    expect(anchorClicks[0].href).toBe('blob:test')
    expect(revokeUrl).toHaveBeenCalledWith('blob:test')

    vi.restoreAllMocks()
  })

  it('calls navigator.share when canShare supports files', async () => {
    const blob = new Blob(['x'], { type: 'image/png' })
    const shareFn = vi.fn().mockResolvedValue(undefined)
    const canShareFn = vi.fn().mockReturnValue(true)
    ;(navigator as unknown as Record<string, unknown>).canShare = canShareFn
    ;(navigator as unknown as Record<string, unknown>).share = shareFn

    await shareImageBlob(blob, 'Test')

    expect(canShareFn).toHaveBeenCalled()
    expect(shareFn).toHaveBeenCalled()
  })

  it('uses download fallback when navigator.share throws non-AbortError', async () => {
    const blob = new Blob(['x'], { type: 'image/png' })
    const canShareFn = vi.fn().mockReturnValue(true)
    const shareFn = vi.fn().mockRejectedValue(new Error('denied'))
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fallback')
    ;(navigator as unknown as Record<string, unknown>).canShare = canShareFn
    ;(navigator as unknown as Record<string, unknown>).share = shareFn

    await shareImageBlob(blob, 'Test')

    expect(shareFn).toHaveBeenCalled()
    expect(createUrl).toHaveBeenCalledWith(blob)
    createUrl.mockRestore()
  })

  it('does not download when navigator.share aborts', async () => {
    const blob = new Blob(['x'], { type: 'image/png' })
    const abortError = new DOMException('aborted', 'AbortError')
    const shareFn = vi.fn().mockRejectedValue(abortError)
    const canShareFn = vi.fn().mockReturnValue(true)
    const createUrl = vi.spyOn(URL, 'createObjectURL')
    ;(navigator as unknown as Record<string, unknown>).canShare = canShareFn
    ;(navigator as unknown as Record<string, unknown>).share = shareFn

    await shareImageBlob(blob, 'Test')

    expect(shareFn).toHaveBeenCalled()
    expect(createUrl).not.toHaveBeenCalled()
    createUrl.mockRestore()
  })
})
