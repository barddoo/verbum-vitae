import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { t } from '@lingui/core/macro'

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
    text: t`Estou memorizando a Bíblia!`,
    url: browseUrl,
  }
}

export async function shareSession(reviewed: number): Promise<void> {
  const appUrl = window.location.origin
  const text =
    reviewed === 1
      ? t`Revisei 1 versículo agora no Verbum Vitae 🕊️ — memorizando a Bíblia com repetição espaçada.`
      : t`Revisei ${reviewed} versículos agora no Verbum Vitae 🕊️ — memorizando a Bíblia com repetição espaçada.`
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
  if (Capacitor.isNativePlatform()) return shareNative(blob, title)
  return shareWeb(blob, title)
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
  const base64 = await blobToBase64(blob)
  const { uri } = await Filesystem.writeFile({
    path: `versiculo-${Date.now()}.png`,
    data: base64,
    directory: Directory.Cache,
  })
  try {
    await Share.share({ title, files: [uri] })
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
