import { Plus, X } from 'lucide-react'
import { MAX_PLAYERS, MIN_PLAYERS, type Mode } from './game'

interface Props {
  mode: Mode
  names: string[]
  onChange: (names: string[]) => void
}

export function PlayersForm({ mode, names, onChange }: Props) {
  const set = (i: number, v: string) => onChange(names.map((n, j) => (j === i ? v : n)))
  const label = (i: number) => (mode === 'teams' ? `Equipe ${i === 0 ? 'A' : 'B'}` : `Jogador ${i + 1}`)

  return (
    <div className={mode === 'teams' ? 'cl-setup-teams' : 'cl-setup-players'}>
      {names.map((name, i) => (
        <div key={i} className="cl-setup-group">
          <label className="cl-label" htmlFor={`cl-player-${i}`}>
            {label(i)}
          </label>
          <div className="cl-player-row">
            <input
              id={`cl-player-${i}`}
              type="text"
              className={`cl-input cl-p${i}`}
              value={name}
              onChange={(e) => set(i, e.target.value)}
              placeholder={label(i)}
              maxLength={20}
              autoComplete="off"
            />
            {mode === 'individual' && names.length > MIN_PLAYERS && (
              <button
                type="button"
                className="cl-icon-btn"
                onClick={() => onChange(names.filter((_, j) => j !== i))}
                aria-label={`Remover ${label(i)}`}
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      ))}
      {mode === 'individual' && names.length < MAX_PLAYERS && (
        <button type="button" className="cl-add-btn" onClick={() => onChange([...names, ''])}>
          <Plus size={18} aria-hidden="true" /> Adicionar jogador
        </button>
      )}
    </div>
  )
}
