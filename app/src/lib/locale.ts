import type { Messages } from '@lingui/core'
import { i18n } from '@lingui/core'

export type Locale = 'pt-BR' | 'en'

const LOCALE_KEY = 'vv-locale'

export function detectLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY)
  if (saved === 'pt-BR' || saved === 'en') return saved as Locale
  return navigator.language.startsWith('en') ? 'en' : 'pt-BR'
}

export async function loadAndActivateCatalog(locale: Locale): Promise<void> {
  let messages: Messages
  if (locale === 'en') {
    messages = ((await import('../locales/en/messages.po')) as unknown as { messages: Messages }).messages
  } else {
    messages = ((await import('../locales/pt-BR/messages.po')) as unknown as { messages: Messages }).messages
  }
  i18n.loadAndActivate({ locale, messages })
}

export async function setLocale(locale: Locale): Promise<void> {
  localStorage.setItem(LOCALE_KEY, locale)
  await loadAndActivateCatalog(locale)
}

export { i18n }
