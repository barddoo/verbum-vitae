import { useRef, useState } from 'react'

const EMOJI_OPTIONS = ['📖', '⭐', '🙏', '❤️', '🔥', '✝️', '📜', '🛡️', '🎵', '⚓', '🌟', '🍇', '⛰️', '🩸', '✦', '✠', '💡', '🕊️', '🌿', '💧']

const COLOR_OPTIONS = [
  { label: 'Ouro', value: '#c9a84c' },
  { label: 'Sálvia', value: '#4a9e7a' },
  { label: 'Rubi', value: '#c0526a' },
  { label: 'Azul', value: '#4a7bb5' },
  { label: 'Violeta', value: '#7b6cb0' },
  { label: 'Âmbar', value: '#d48836' },
  { label: 'Verde-água', value: '#3a9e8f' },
  { label: 'Cinza', value: '#6b7280' },
]

export interface CollectionFormData {
  name: string
  description: string
  icon: string
  color: string | null
}

export function CollectionFormModal({
  isOpen,
  onClose,
  onSave,
  collection,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CollectionFormData) => void | Promise<void>
  collection?: { name: string; description: string; icon: string; color?: string | null } | null
}) {
  const [name, setName] = useState(collection?.name || '')
  const [description, setDescription] = useState(collection?.description || '')
  const [icon, setIcon] = useState(collection?.icon || '📖')
  const [color, setColor] = useState(collection?.color || null)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const isEdit = !!collection

  if (!isOpen) return null

  const canSave = name.trim().length > 0

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), description: description.trim(), icon, color })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card collection-form-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Editar coleção' : 'Nova coleção'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="collection-name" className="form-label">
            Nome
          </label>
          <input
            ref={nameRef}
            id="collection-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Versículos de confiança…"
            autoComplete="off"
            spellCheck={false}
            disabled={isEdit}
          />
          {isEdit && <span className="form-hint">O nome não pode ser alterado após a criação.</span>}
        </div>

        <div className="form-group">
          <label htmlFor="collection-desc" className="form-label">
            Descrição
          </label>
          <input
            id="collection-desc"
            type="text"
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Uma breve descrição…"
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <span className="form-label">Ícone</span>
          <div className="emoji-grid">
            {EMOJI_OPTIONS.map((em) => (
              <button
                key={em}
                type="button"
                className={`emoji-option ${icon === em ? 'selected' : ''}`}
                onClick={() => setIcon(em)}
                aria-label={em}
                aria-pressed={icon === em}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">Cor</span>
          <div className="color-picker">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`color-swatch ${color === c.value ? 'selected' : ''}`}
                style={{ backgroundColor: c.value }}
                onClick={() => setColor(color === c.value ? null : c.value)}
                aria-label={c.label}
                title={c.label}
              />
            ))}
            {color && (
              <button type="button" className="color-clear" onClick={() => setColor(null)} aria-label="Limpar cor" title="Limpar cor">
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar coleção'}
          </button>
        </div>
      </div>
    </div>
  )
}
