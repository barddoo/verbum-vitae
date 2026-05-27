interface WhatsAppInviteParams {
  verseRef?: string
  verseText?: string
}

export function buildWhatsAppInvite({ verseRef, verseText }: WhatsAppInviteParams = {}): string {
  const appUrl = window.location.origin

  const lines =
    verseRef && verseText
      ? [`Estou memorizando *${verseRef}*:`, `_"${verseText}"_`, '', `Vem memorizar a Bíblia também → ${appUrl}`]
      : [`Estou memorizando a Bíblia!`, '', `Vem memorizar também → ${appUrl}`]

  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
}
