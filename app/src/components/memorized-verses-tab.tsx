import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Progress } from '../lib/db'
import { db, fetchVersesBatch, parseTextKey, removeVersesFromMemory } from '../lib/db'
import { verseIdToReference } from '../lib/format'
import { logProgressChange } from '../lib/sync'
import { VerseProgressCard } from './verse-progress-card'

type FilterState = number | null
type SortKey = 'dueDate' | 'reference' | 'state' | 'streak'

interface Item {
  progress: Progress
  text: string
}

export function MemorizedVersesTab() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [filterState, setFilterState] = useState<FilterState>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('dueDate')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  useEffect(() => {
    loadVerses()
  }, [])

  async function loadVerses() {
    setLoading(true)
    const all = await db.progress.toArray()
    if (all.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    const keys = all.map((p) => ({ verseId: p.verseId, translation: p.translation }))
    const textMap = await fetchVersesBatch(keys)

    const joined: Item[] = all.map((p) => ({
      progress: p,
      text: textMap.get(p.verseId) || '',
    }))

    setItems(joined)
    setLoading(false)
  }

  function toggleSelect(verseId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(verseId)) next.delete(verseId)
      else next.add(verseId)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  function reviewSelected() {
    localStorage.setItem('review_verse_selection', JSON.stringify([...selectedIds]))
    navigate({ to: '/review' })
  }

  async function handleRemove(verseId: string) {
    const target = items.filter((item) => item.progress.verseId === verseId)
    if (target.length === 0) return
    await removeVersesFromMemory(
      target.map((item) => ({ verseId: item.progress.verseId, translation: item.progress.translation })),
      logProgressChange,
    )
    setItems((prev) => prev.filter((item) => item.progress.verseId !== verseId))
  }

  async function handleRemoveSelected() {
    if (selectedIds.size === 0) return
    const target = items.filter((item) => selectedIds.has(item.progress.verseId))
    await removeVersesFromMemory(
      target.map((item) => ({ verseId: item.progress.verseId, translation: item.progress.translation })),
      logProgressChange,
    )
    setItems((prev) => prev.filter((item) => !selectedIds.has(item.progress.verseId)))
    clearSelection()
  }

  const parseBookNumber = useCallback((verseId: string) => parseTextKey(verseId).sectionIndex, [])

  const filtered = useMemo(() => {
    let result = items

    if (filterState !== null) {
      result = result.filter((item) => item.progress.state === filterState)
    }

    if (search) {
      const lower = search.toLowerCase()
      result = result.filter((item) => {
        const ref = verseIdToReference(item.progress.verseId).toLowerCase()
        return ref.includes(lower) || item.text.toLowerCase().includes(lower)
      })
    }

    result = [...result]

    switch (sort) {
      case 'dueDate':
        result.sort((a, b) => a.progress.dueDate - b.progress.dueDate)
        break
      case 'reference':
        result.sort((a, b) => {
          const aBN = parseBookNumber(a.progress.verseId)
          const bBN = parseBookNumber(b.progress.verseId)
          if (aBN !== bBN) return aBN - bBN
          return a.progress.verseId.localeCompare(b.progress.verseId)
        })
        break
      case 'state':
        result.sort((a, b) => a.progress.state - b.progress.state)
        break
      case 'streak':
        result.sort((a, b) => b.progress.streak - a.progress.streak)
        break
    }

    return result
  }, [items, filterState, search, sort, parseBookNumber])

  const filterOptions: { label: string; value: FilterState }[] = [
    { label: 'Todos', value: null },
    { label: 'Novo', value: 0 },
    { label: 'Aprendendo', value: 1 },
    { label: 'Revisando', value: 2 },
    { label: 'Reaprendendo', value: 3 },
  ]

  if (loading) {
    return <div className="stats-empty">Carregando…</div>
  }

  if (items.length === 0) {
    return (
      <div className="stats-empty">
        Nenhum texto memorizado ainda.
        <br />
        Adicione textos na página Textos para vê-los aqui.
      </div>
    )
  }

  return (
    <div className="memorized-verses-tab">
      <div className="filter-chips">
        {filterOptions.map((opt) => (
          <button
            key={opt.label}
            type="button"
            className={`filter-chip${filterState === opt.value ? ' active' : ''}`}
            onClick={() => setFilterState(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="verse-controls">
        <input
          type="text"
          className="verse-search"
          placeholder="Buscar por referência ou texto…"
          aria-label="Buscar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          spellCheck={false}
        />
        <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar por">
          <option value="dueDate">Data de revisão</option>
          <option value="reference">Referência</option>
          <option value="state">Estágio</option>
          <option value="streak">Sequência</option>
        </select>
        {!selectionMode ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectionMode(true)}>
            Selecionar
          </button>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearSelection}>
            Cancelar
          </button>
        )}
      </div>

      <div className="verse-list">
        {filtered.map((item) => (
          <VerseProgressCard
            key={item.progress.verseId + item.progress.translation}
            verseId={item.progress.verseId}
            text={item.text}
            state={item.progress.state}
            dueDate={item.progress.dueDate}
            streak={item.progress.streak}
            onRemove={handleRemove}
            selected={selectedIds.has(item.progress.verseId)}
            onSelect={selectionMode ? toggleSelect : undefined}
          />
        ))}
      </div>

      {filtered.length === 0 && <div className="stats-empty">Nenhum texto encontrado.</div>}

      {selectedIds.size > 0 && (
        <div className="selection-bar">
          <div className="selection-bar-info">
            <span className="selection-bar-count">{selectedIds.size}</span>
            <span className="selection-bar-preview">{selectedIds.size === 1 ? 'versículo selecionado' : 'versículos selecionados'}</span>
          </div>
          <div className="selection-bar-actions">
            <button type="button" className="btn btn-secondary" onClick={clearSelection}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void handleRemoveSelected()}
              title="Esquece os textos selecionados e os tira da fila de revisão"
            >
              Remover da memória
            </button>
            <button type="button" className="btn btn-primary" onClick={reviewSelected}>
              Revisar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
