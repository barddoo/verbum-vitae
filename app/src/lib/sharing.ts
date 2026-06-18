interface ShareVerseParams {
  verseRef?: string
  verseText?: string
}

function buildMessage({ verseRef, verseText }: ShareVerseParams = {}): { title: string; text: string; url: string } {
  const appUrl = window.location.origin
  const browseUrl = `${appUrl}/browse`

  if (verseRef && verseText) {
    return {
      title: verseRef,
      text: `"${verseText}" — ${verseRef}`,
      url: browseUrl,
    }
  }

  return {
    title: 'Verbum Vitae',
    text: 'Estou memorizando a Bíblia!',
    url: browseUrl,
  }
}

export async function shareSession(reviewed: number): Promise<void> {
  const appUrl = window.location.origin
  const text =
    reviewed === 1
      ? `Revisei 1 versículo agora no Verbum Vitae 🕊️ — memorizando a Bíblia com repetição espaçada.`
      : `Revisei ${reviewed} versículos agora no Verbum Vitae 🕊️ — memorizando a Bíblia com repetição espaçada.`
  const shareData = { title: 'Verbum Vitae', text, url: appUrl }
  try {
    await navigator.share(shareData)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    fallbackCopy(shareData)
  }
}

export async function shareVerse(params: ShareVerseParams = {}): Promise<void> {
  const shareData = buildMessage(params)

  try {
    await navigator.share(shareData)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    fallbackCopy(shareData)
  }
}

function fallbackCopy({ title, text, url }: { title: string; text: string; url: string }) {
  const full = `${title}\n${text}\n${url}`
  navigator.clipboard.writeText(full).catch(() => {
    alert(full)
  })
}

export async function shareImageBlob(blob: Blob, title: string): Promise<void> {
  if (isNative()) return shareNative(blob, title)
  return shareWeb(blob, title)
}

function isNative(): boolean {
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    return cap?.isNativePlatform?.() === true
  } catch {
    return false
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function shareNative(blob: Blob, title: string): Promise<void> {
  const cap = (
    window as unknown as {
      Capacitor?: {
        plugins: { Share: { share: (o: { title?: string; files: string[] }) => Promise<void> }; Filesystem: typeof FilesystemNS }
      }
    }
  ).Capacitor
  if (!cap?.plugins?.Share || !cap?.plugins?.Filesystem) return shareWeb(blob, title)
  const base64 = await blobToBase64(blob)
  const { uri } = await cap.plugins.Filesystem.writeFile({
    path: `versiculo-${Date.now()}.png`,
    data: base64,
    directory: 'CACHE',
  })
  try {
    await cap.plugins.Share.share({ title, files: [uri] })
  } catch {
    // user dismissed the sheet — no-op
  }
}

async function shareWeb(blob: Blob, title: string): Promise<void> {
  const file = new File([blob], 'versiculo.png', { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] })
      return
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'versiculo.png'
  a.click()
  URL.revokeObjectURL(url)
}

declare const FilesystemNS: {
  writeFile: (o: { path: string; data: string; directory: string }) => Promise<{ uri: string }>
}
