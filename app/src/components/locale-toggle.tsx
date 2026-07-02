import { useState } from 'react'
import type { Locale } from '../lib/locale'
import { detectLocale, setLocale } from '../lib/locale'

export function LocaleToggle() {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)
  const [switching, setSwitching] = useState(false)

  async function handleToggle() {
    if (switching) return
    const next: Locale = locale === 'pt-BR' ? 'en' : 'pt-BR'
    setSwitching(true)
    await setLocale(next)
    setLocaleState(next)
    setSwitching(false)
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={switching}
      className="nav-item nav-locale-toggle"
      aria-label={locale === 'pt-BR' ? 'Switch to English' : 'Mudar para Português'}
    >
      <span className="nav-locale-icon">🌐</span>
      <span>{locale === 'pt-BR' ? 'EN' : 'PT'}</span>
    </button>
  )
}
