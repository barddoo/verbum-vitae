import { type ThemePref, useTheme } from '../../lib/theme'

const options: { value: ThemePref; label: string; hint: string }[] = [
  { value: 'system', label: 'Sistema', hint: 'Segue o tema do aparelho' },
  { value: 'light', label: 'Claro', hint: 'Tema claro' },
  { value: 'dark', label: 'Escuro', hint: 'Tema escuro' },
]

export function AppearanceSection() {
  const { themePref, setTheme } = useTheme()

  return (
    <section className="settings-section" aria-labelledby="settings-appearance-title">
      <h2 id="settings-appearance-title" className="settings-section-title">
        Aparência
      </h2>
      <fieldset className="settings-fieldset">
        <legend className="settings-fieldset-legend">Tema</legend>
        <div className="settings-theme-list">
          {options.map((option) => {
            const checked = themePref === option.value
            return (
              <label key={option.value} className={`settings-theme-option${checked ? ' selected' : ''}`}>
                <input type="radio" name="theme-pref" value={option.value} checked={checked} onChange={() => setTheme(option.value)} />
                <span className="settings-theme-label">{option.label}</span>
                <span className="settings-theme-hint">{option.hint}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
    </section>
  )
}
