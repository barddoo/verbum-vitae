import type { Difficulty, VerseItem } from './blanks'
import { CATECHISM, catechismItems } from './catechism'
import { parseItems } from './parse-text'

export interface SourceState {
  kind: 'text' | 'catechism'
  text: string
  from: number
  to: number
  showQuestion: boolean
  shuffle: boolean
  difficulty: Difficulty
}

export const INITIAL_SOURCE: SourceState = {
  kind: 'text',
  text: '',
  from: 1,
  to: CATECHISM.length,
  showQuestion: false,
  shuffle: false,
  difficulty: 'normal',
}

export function buildItems(s: SourceState): VerseItem[] {
  return s.kind === 'text'
    ? parseItems(s.text, s.difficulty)
    : catechismItems(s.from, s.to, s.showQuestion, s.difficulty, s.shuffle ? Math.random : undefined)
}

const PLACEHOLDER = '# Título (opcional)\nPrimeiro texto…\n\nSegundo texto, separado por linha em branco…'
const LEVELS: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Fácil — poucas lacunas' },
  { id: 'normal', label: 'Normal' },
  { id: 'hard', label: 'Difícil — todas as palavras-chave' },
]
const KINDS = [
  { id: 'text', label: 'Texto livre' },
  { id: 'catechism', label: 'Catecismo' },
] as const

interface Props {
  value: SourceState
  onChange: (s: SourceState) => void
}

export function SourceForm({ value, onChange }: Props) {
  const set = (patch: Partial<SourceState>) => onChange({ ...value, ...patch })
  const numbers = CATECHISM.map((_, i) => i + 1)

  return (
    <div className="cl-setup-group">
      <div className="cl-mode-toggle" role="presentation">
        {KINDS.map((k) => (
          <button key={k.id} type="button" className="cl-mode-btn" aria-pressed={value.kind === k.id} onClick={() => set({ kind: k.id })}>
            {k.label}
          </button>
        ))}
      </div>

      {value.kind === 'text' ? (
        <>
          <label className="cl-label" htmlFor="cl-text">
            Textos
          </label>
          <textarea
            id="cl-text"
            className="cl-input cl-textarea"
            value={value.text}
            onChange={(e) => set({ text: e.target.value })}
            placeholder={PLACEHOLDER}
            rows={8}
          />
          <p className="cl-setup-hint cl-text-hint">Separe itens com uma linha em branco. Uma primeira linha com # vira o título.</p>
        </>
      ) : (
        <>
          <div className="cl-setup-teams">
            {(['from', 'to'] as const).map((key) => (
              <div key={key} className="cl-setup-group">
                <label className="cl-label" htmlFor={`cl-${key}`}>
                  {key === 'from' ? 'Da pergunta' : 'Até a pergunta'}
                </label>
                <select id={`cl-${key}`} className="cl-select" value={value[key]} onChange={(e) => set({ [key]: Number(e.target.value) })}>
                  {numbers.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <label className="cl-check">
            <input type="checkbox" checked={value.showQuestion} onChange={(e) => set({ showQuestion: e.target.checked })} />
            Mostrar a pergunta desde o início
          </label>
          <label className="cl-check">
            <input type="checkbox" checked={value.shuffle} onChange={(e) => set({ shuffle: e.target.checked })} />
            Ordem aleatória
          </label>
        </>
      )}

      <label className="cl-label" htmlFor="cl-difficulty">
        Lacunas
      </label>
      <select
        id="cl-difficulty"
        className="cl-select"
        value={value.difficulty}
        onChange={(e) => set({ difficulty: e.target.value as Difficulty })}
      >
        {LEVELS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}
