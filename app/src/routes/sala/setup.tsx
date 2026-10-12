import { Tv2 } from 'lucide-react'
import { useState } from 'react'
import type { VerseItem } from './blanks'
import { defaultPlayers, type Mode, resolveNames } from './game'
import { PlayersForm } from './players-form'
import { buildItems, INITIAL_SOURCE, SourceForm, type SourceState } from './source-form'

interface SetupProps {
  onStart: (verses: VerseItem[], mode: Mode, players: string[]) => void
}

const MODES: { id: Mode; label: string }[] = [
  { id: 'teams', label: 'Equipes' },
  { id: 'individual', label: 'Individual' },
]

export function ClassroomSetup({ onStart }: SetupProps) {
  const [mode, setMode] = useState<Mode>('teams')
  const [names, setNames] = useState<Record<Mode, string[]>>({
    teams: defaultPlayers('teams'),
    individual: defaultPlayers('individual'),
  })
  const [source, setSource] = useState<SourceState>(INITIAL_SOURCE)
  const [error, setError] = useState<string | null>(null)

  function handleStart() {
    const verses = buildItems(source)
    if (verses.length === 0) {
      setError('Cole ao menos um texto ou escolha perguntas.')
      return
    }
    setError(null)
    onStart(verses, mode, resolveNames(mode, names[mode]))
  }

  return (
    <div className="cl-setup">
      <div className="cl-setup-header">
        <Tv2 size={44} className="cl-setup-icon" aria-hidden="true" />
        <h1 className="cl-setup-title">Sala de Aula</h1>
        <p className="cl-setup-subtitle">Modo gincana para TV — configure e apresente</p>
      </div>

      <div className="cl-setup-form">
        <SourceForm value={source} onChange={setSource} />

        <fieldset className="cl-mode-toggle" aria-label="Modo de jogo">
          {MODES.map((m) => (
            <button key={m.id} type="button" className="cl-mode-btn" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </fieldset>

        <PlayersForm mode={mode} names={names[mode]} onChange={(n) => setNames((s) => ({ ...s, [mode]: n }))} />

        {error && (
          <p className="cl-error" role="alert">
            {error}
          </p>
        )}

        <button type="button" className="cl-btn-start" onClick={handleStart}>
          Iniciar Apresentação
        </button>

        <p className="cl-setup-hint">
          Atalhos: <kbd>Espaço</kbd> revelar · <kbd>1</kbd>–<kbd>9</kbd> pontuar · <kbd>Q</kbd> pergunta · <kbd>N</kbd> próximo ·{' '}
          <kbd>R</kbd> reiniciar · <kbd>Esc</kbd> sair
        </p>
      </div>
    </div>
  )
}
