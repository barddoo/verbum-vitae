import { t } from '@lingui/core/macro'
import { Languages } from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import { detectLocale, type Locale, setLocale } from '../lib/locale'

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'pt-BR', label: 'Português' },
  { value: 'en', label: 'English' },
]

export function LocaleToggle() {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)
  const [switching, setSwitching] = useState(false)

  async function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    if (switching) return
    const next = e.target.value as Locale
    if (next === locale) return
    setSwitching(true)
    await setLocale(next)
    setLocaleState(next)
    setSwitching(false)
  }

  return (
    <span className="locale-select-wrapper">
      <Languages size={16} strokeWidth={1.5} aria-hidden="true" />
      <select className="locale-select" value={locale} onChange={handleChange} disabled={switching} aria-label={t`Idioma`}>
        {LOCALES.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
    </span>
  )
}
