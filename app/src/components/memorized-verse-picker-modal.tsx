import { Check, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { db, fetchVersesBatch } from '../lib/db'
import { verseIdToReference } from '../lib/format'

interface VerseItem {
  verseId: string
  translation: string
  reference: string
  text: string
}

export function MemorizedVersePickerModal({
  isOpen,
  onClose,
  onSave,
  collectionId,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (verses: { verseId: string; translation: string }[]) => void
  collectionId: number
}) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<VerseItem[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOpen) return
    async function load() {
      setLoading(true)
      setSearch('')
      setSelected(new Set())

      const [progress, cvs] = await Promise.all([db.progress.toArray(), db.collectionVerses.where({ collectionId }).toArray()])

      const inCollection = new Set(cvs.map((cv) => `${cv.verseId}|${cv.translation}`))
      const filtered = progress.filter((p) => !inCollection.has(`${p.verseId}|${p.translation}`))

      if (filtered.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      const textMap = await fetchVersesBatch(filtered.map((p) => ({ verseId: p.verseId, translation: p.translation })))

      const verseItems: VerseItem[] = filtered.map((p) => ({
        verseId: p.verseId,
        translation: p.translation,
        reference: verseIdToReference(p.verseId),
        text: textMap.get(p.verseId) || '',
      }))

      verseItems.sort((a, b) => a.reference.localeCompare(b.reference))
      setItems(verseItems)
      setLoading(false)
    }
    load()
  }, [isOpen, collectionId])

  const filtered = useMemo(() => {
    if (!search) return items
    const lower = search.toLowerCase()
    return items.filter((item) => item.reference.toLowerCase().includes(lower))
  }, [items, search])

  function toggle(verseId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(verseId)) next.delete(verseId)
      else next.add(verseId)
      return next
    })
  }

  function handleConfirm() {
    const toAdd = items
      .filter((item) => selected.has(item.verseId))
      .map((item) => ({ verseId: item.verseId, translation: item.translation }))
    if (toAdd.length === 0) return
    onSave(toAdd)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card memorized-picker-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">Meus versículos</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} aria-hidden />
          </button>
        </div>

        <input
          type="text"
          className="form-input memorized-picker-search"
          placeholder="Buscar referência…"
          aria-label="Buscar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />

        {loading ? (
          <div className="loading">Carregando…</div>
        ) : items.length === 0 ? (
          <p className="memorized-picker-empty">Nenhum versículo memorizado ainda.</p>
        ) : filtered.length === 0 ? (
          <p className="memorized-picker-empty">Nenhum resultado para &ldquo;{search}&rdquo;</p>
        ) : (
          <div className="memorized-picker-list">
            {filtered.map((item) => {
              const sel = selected.has(item.verseId)
              return (
                <button
                  type="button"
                  key={item.verseId}
                  className={`memorized-picker-row ${sel ? 'selected' : ''}`}
                  onClick={() => toggle(item.verseId)}
                >
                  <span className={`memorized-picker-check${sel ? ' checked' : ''}`}>{sel ? <Check size={10} aria-hidden /> : ''}</span>
                  <div className="memorized-picker-body">
                    <span className="memorized-picker-ref">{item.reference}</span>
                    <span className="memorized-picker-text">{item.text.slice(0, 120)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {selected.size > 0 && (
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleConfirm}>
              Adicionar {selected.size} {selected.size === 1 ? 'versículo' : 'versículos'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
