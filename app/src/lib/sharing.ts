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
