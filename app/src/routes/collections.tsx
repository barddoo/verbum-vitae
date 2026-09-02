import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Check, Pencil, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_TRANSLATION } from 'shared/bible'
import { type CollectionFormData, CollectionFormModal } from '../components/collection-form-modal'
import { MemorizedVersePickerModal } from '../components/memorized-verse-picker-modal'
import { PageMeta } from '../components/page-meta'
import { bundledCollections, verseRefToId } from '../data/collections'
import {
  addCollectionAsBlock,
  addCollectionToMemory,
  addVersesToCollection,
  addVersesToMemory,
  createUserCollection,
  db,
  deleteUserCollection,
  fetchVersesBatch,
  getCollectionProgress,
  removeVerseFromCollection,
  removeVersesFromMemory,
  updateUserCollection,
} from '../lib/db'
import { verseIdToReference } from '../lib/format'
import { slugify } from '../lib/slugify'
import { cachedGet } from '../lib/storage'
import { logProgressChange } from '../lib/sync'

interface CollectionEntry {
  id: number
  dbId: number
  slug: string
  name: string
  description: string
  icon: string
  color?: string | null
  isBuiltin: number
  total: number
  memorized: number
  percent: number
}

let collectionsSeeding: Promise<void> | null = null

async function seedCollections() {
  // One explicit rw transaction: StrictMode double-invokes load(), so two concurrent
  // runs would otherwise both `put` the same bundled slug and trip the unique index
  // ("Unable to add key to index 'slug'"). A single transaction plus slug/name lookups
  // inside makes seeding idempotent no matter how many times or from where it runs.
  await db.transaction('rw', db.collections, db.collectionVerses, async () => {
    const bundledSlugByName = new Map(bundledCollections.map((c) => [c.name, c.id]))

    // Backfill slugs for rows created before the slug index existed; never steal a slug
    // another row already owns.
    const slugless = (await db.collections.toArray()).filter((c) => !c.slug)
    for (const c of slugless) {
      const slug = bundledSlugByName.get(c.name) || slugify(c.name)
      if (!slug) continue
      if (await db.collections.where({ slug }).first()) continue
      await db.collections.update(c.id!, { slug })
    }

    for (const c of bundledCollections) {
      if (await db.collections.where({ slug: c.id }).first()) continue
      const nameRow = await db.collections.where({ name: c.name }).first()
      if (nameRow) {
        if (nameRow.slug !== c.id) await db.collections.update(nameRow.id!, { slug: c.id })
        continue
      }
      const cId = (await db.collections.put({
        slug: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
        isBuiltin: 1,
        createdAt: Date.now(),
      }))!
      let order = 0
      const entries: { collectionId: number; verseId: string; translation: string; sortOrder: number }[] = []
      for (const ref of c.verses) {
        const verseId = verseRefToId(ref)
        if (Array.isArray(ref.verse)) {
          for (let v = ref.verse[0]; v <= ref.verse[1]; v++) {
            entries.push({
              collectionId: cId,
              verseId: `b:${ref.book}:${ref.chapter}:${v}`,
              translation: DEFAULT_TRANSLATION,
              sortOrder: order++,
            })
          }
        } else {
          entries.push({ collectionId: cId, verseId, translation: DEFAULT_TRANSLATION, sortOrder: order++ })
        }
      }
      await db.collectionVerses.bulkPut(entries)
    }
  })
}

function ensureCollectionsSeeded(): Promise<void> {
  if (!collectionsSeeding) {
    collectionsSeeding = seedCollections().finally(() => {
      collectionsSeeding = null
    })
  }
  return collectionsSeeding
}

const loadingSpinner = <div className="loading">Carregando…</div>

export function CollectionsListPage() {
  const navigate = useNavigate()
  const [collections, setCollections] = useState<CollectionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    await ensureCollectionsSeeded()
    const allCols = await db.collections.toArray()
    const entries: CollectionEntry[] = await Promise.all(
      allCols.map(async (col) => {
        const { total, memorized, percent } = await getCollectionProgress(col.id!, DEFAULT_TRANSLATION)
        return {
          id: col.id!,
          dbId: col.id!,
          slug: col.slug,
          name: col.name,
          description: col.description,
          icon: col.icon,
          color: col.color,
          isBuiltin: col.isBuiltin,
          total,
          memorized,
          percent,
        }
      }),
    )
    setCollections(entries)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(formData: CollectionFormData) {
    const id = await createUserCollection({
      name: formData.name,
      description: formData.description,
      icon: formData.icon,
      color: formData.color,
      verses: [],
    })
    setShowForm(false)
    await load()
    const created = await db.collections.get(id)
    if (created) {
      navigate({ to: '/collections/$slug', params: { slug: created.slug } })
    }
  }

  const userCollections = collections.filter((c) => !c.isBuiltin)
  const builtinCollections = collections.filter((c) => c.isBuiltin)

  if (loading) return <div className="page">{loadingSpinner}</div>

  return (
    <div className="page collections-page">
      <PageMeta
        title="Coleções · Verbum Vitae"
        description="Crie e gerencie coleções de versículos para memorizar. Organize seus versículos favoritos por temas e acompanhe seu progresso."
        path="/collections"
      />
      <h2 className="collections-title">Coleções</h2>
      <p className="collections-subtitle">Conjuntos de textos para memorizar</p>

      <button type="button" className="btn btn-primary btn-collection-create" onClick={() => setShowForm(true)}>
        + Criar coleção
      </button>

      {userCollections.length > 0 && (
        <>
          <h3 className="collection-section-title">Suas coleções</h3>
          <div className="collection-grid">
            {userCollections.map((col) => (
              <Link key={col.dbId} to="/collections/$slug" params={{ slug: col.slug }} className="collection-card-link">
                <div
                  className="collection-card collection-card-user"
                  style={col.color ? { borderTopColor: col.color, borderTopWidth: 3, borderTopStyle: 'solid' } : undefined}
                >
                  <div className="collection-card-icon">{col.icon}</div>
                  <div className="collection-card-body">
                    <h3 className="collection-card-name">{col.name}</h3>
                    <p className="collection-card-desc">{col.description}</p>
                  </div>
                  <div className="collection-card-footer">
                    <span className="collection-card-count">
                      {col.memorized}/{col.total}
                    </span>
                    <div className="collection-progress-bar">
                      <div className="collection-progress-fill" style={{ width: `${col.percent}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {builtinCollections.length > 0 && (
        <>
          <h3 className="collection-section-title">Coleções integradas</h3>
          <div className="collection-grid">
            {builtinCollections.map((col) => (
              <Link key={col.dbId} to="/collections/$slug" params={{ slug: col.slug }} className="collection-card-link">
                <div className="collection-card">
                  <div className="collection-card-icon">{col.icon}</div>
                  <div className="collection-card-body">
                    <h3 className="collection-card-name">{col.name}</h3>
                    <p className="collection-card-desc">{col.description}</p>
                  </div>
                  <div className="collection-card-footer">
                    <span className="collection-card-count">
                      {col.memorized}/{col.total}
                    </span>
                    <div className="collection-progress-bar">
                      <div className="collection-progress-fill" style={{ width: `${col.percent}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {collections.length === 0 && (
        <div className="empty-state">
          <p>Nenhuma coleção encontrada.</p>
        </div>
      )}

      <CollectionFormModal isOpen={showForm} onClose={() => setShowForm(false)} onSave={handleCreate} />
    </div>
  )
}

export function CollectionDetailPage() {
  const { slug } = useParams({ from: '/collections/$slug' })
  const navigate = useNavigate()
  const [col, setCol] = useState<CollectionEntry | null>(null)
  const [verses, setVerses] = useState<{ verseId: string; reference: string; text: string; translation: string; memorized: boolean }[]>([])
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [addingBlock, setAddingBlock] = useState(false)
  const [addedBlock, setAddedBlock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showMemorized, setShowMemorized] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedVerses, setSelectedVerses] = useState<Set<string>>(new Set())
  const [addingSelected, setAddingSelected] = useState(false)

  const load = useCallback(async () => {
    const c = await db.collections.where({ slug }).first()
    if (!c) return

    const dbId = c.id!
    const [progressResult, cvs, allProgress] = await Promise.all([
      getCollectionProgress(dbId, DEFAULT_TRANSLATION),
      db.collectionVerses.where({ collectionId: dbId }).sortBy('sortOrder'),
      db.progress.toArray(),
    ])

    setCol({
      id: dbId,
      dbId,
      slug: c.slug,
      name: c.name,
      description: c.description,
      icon: c.icon,
      color: c.color,
      isBuiltin: c.isBuiltin,
      ...progressResult,
    })

    const memSet = new Set<string>()
    for (const p of allProgress) memSet.add(p.verseId + p.translation)

    const verseTexts = await fetchVersesBatch(cvs.map((cv) => ({ verseId: cv.verseId, translation: cv.translation })))

    const verseList: typeof verses = []
    for (const cv of cvs) {
      const text = verseTexts.get(cv.verseId) || ''
      const ref = verseIdToReference(cv.verseId)
      verseList.push({
        verseId: cv.verseId,
        reference: ref,
        text,
        translation: cv.translation,
        memorized: memSet.has(cv.verseId + cv.translation),
      })
    }
    setVerses(verseList)
    setLoading(false)
  }, [slug])

  useEffect(() => {
    load()
  }, [slug, load])

  async function handleAddAll() {
    if (!col) return
    setAdding(true)
    const userTranslation = (cachedGet('translation') as string | null) ?? DEFAULT_TRANSLATION
    await addCollectionToMemory(col.dbId, userTranslation, () => '', logProgressChange)
    setAdded(true)
    setAdding(false)
    await load()
  }

  async function handleAddAsBlock() {
    if (!col) return
    setAddingBlock(true)
    const userTranslation = (cachedGet('translation') as string | null) ?? DEFAULT_TRANSLATION
    await addCollectionAsBlock(col.dbId, userTranslation, logProgressChange)
    setAddedBlock(true)
    setAddingBlock(false)
  }

  async function handleEdit(formData: CollectionFormData) {
    if (!col) return
    await updateUserCollection(col.dbId, {
      description: formData.description,
      icon: formData.icon,
      color: formData.color,
    })
    setShowEdit(false)
    await load()
  }

  async function handleDelete() {
    if (!col) return
    setDeleting(true)
    await deleteUserCollection(col.dbId)
    setDeleting(false)
    setShowDeleteConfirm(false)
    navigate({ to: '/collections' })
  }

  async function handleMemorizedSave(versesToAdd: { verseId: string; translation: string }[]) {
    if (!col) return
    await addVersesToCollection(col.dbId, versesToAdd)
    setShowMemorized(false)
    await load()
  }

  function enterSelectionMode() {
    setSelectionMode(true)
    setSelectedVerses(new Set())
  }

  function toggleVerse(key: string) {
    setSelectedVerses((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedVerses(new Set())
  }

  function selectedVersesList() {
    return verses.filter((v) => selectedVerses.has(`${v.verseId}|${v.translation}`))
  }

  async function handleAddSelected() {
    const toAdd = selectedVersesList().filter((v) => !v.memorized)
    if (toAdd.length === 0) return
    setAddingSelected(true)
    await addVersesToMemory(
      toAdd.map((v) => ({ verseId: v.verseId, translation: v.translation })),
      logProgressChange,
    )
    setAddingSelected(false)
    exitSelectionMode()
    await load()
  }

  async function handleRemoveFromMemory() {
    const toRemove = selectedVersesList().filter((v) => v.memorized)
    if (toRemove.length === 0) return
    setAddingSelected(true)
    await removeVersesFromMemory(
      toRemove.map((v) => ({ verseId: v.verseId, translation: v.translation })),
      logProgressChange,
    )
    setAddingSelected(false)
    exitSelectionMode()
    await load()
  }

  async function handleRemoveFromCollection() {
    if (!col || selectedVerses.size === 0) return
    setAddingSelected(true)
    const list = selectedVersesList()
    await Promise.all(list.map((v) => removeVerseFromCollection(col.dbId, v.verseId, v.translation)))
    setAddingSelected(false)
    exitSelectionMode()
    await load()
  }

  const isUserCollection = col && !col.isBuiltin
  const selectedMemorizedCount = selectedVersesList().filter((v) => v.memorized).length
  const selectedNotMemorizedCount = selectedVersesList().length - selectedMemorizedCount

  if (loading) return <div className="page">{loadingSpinner}</div>

  if (!col)
    return (
      <div className="page">
        <div className="empty-state">
          <p>Coleção não encontrada.</p>
          <Link to="/collections" className="btn btn-secondary">
            Voltar
          </Link>
        </div>
      </div>
    )

  return (
    <div className="page collection-detail-page">
      <PageMeta
        title={col ? `${col.name} · Verbum Vitae` : 'Coleção · Verbum Vitae'}
        description={
          col ? `Revise e gerencie os versículos da coleção "${col.name}".` : 'Detalhes da coleção de versículos para memorização.'
        }
        path={`/collections/${slug}`}
      />
      <div className="collection-detail-topbar">
        <Link to="/collections" className="back-btn">
          ← Coleções
        </Link>
        {!selectionMode && (
          <div className="collection-detail-actions-edit">
            {verses.length > 0 && (
              <button type="button" className="btn btn-sm btn-secondary" onClick={enterSelectionMode}>
                Selecionar
              </button>
            )}
            {isUserCollection && (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowEdit(true)}
                  aria-label="Editar coleção"
                  title="Editar"
                >
                  <Pencil size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  aria-label="Excluir coleção"
                  title="Excluir"
                >
                  <X size={14} aria-hidden />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="collection-detail-header" style={col.color ? ({ '--col-accent': col.color } as React.CSSProperties) : undefined}>
        <span className="collection-detail-icon">{col.icon}</span>
        <h2 className="collection-detail-name">{col.name}</h2>
        <p className="collection-detail-desc">{col.description}</p>
      </div>

      <div className="collection-detail-progress">
        <div className="collection-detail-stats">
          <div>
            <span className="collection-detail-stat-num">
              {col.memorized}/{col.total}
            </span>
            <span className="collection-detail-stat-label">memorizados</span>
          </div>
          <span>{col.percent}%</span>
        </div>
        <div className="collection-progress-bar detail">
          <div className="collection-progress-fill" style={{ width: `${col.percent}%` }} />
        </div>
      </div>

      {!selectionMode && verses.length > 0 && <p className="collection-swipe-hint">Use Selecionar para adicionar ou remover versículos</p>}
      {selectionMode && (
        <div className="collection-select-header">
          <span className="collection-select-label">
            {selectedVerses.size > 0
              ? `${selectedVerses.size} selecionado${selectedVerses.size !== 1 ? 's' : ''}`
              : 'Toque para selecionar'}
          </span>
          <button type="button" className="collection-select-exit" aria-label="Sair do modo seleção" onClick={exitSelectionMode}>
            <X size={16} aria-hidden />
          </button>
        </div>
      )}

      <div className="collection-verse-list">
        {verses.map((v) => {
          const key = `${v.verseId}|${v.translation}`
          const sel = selectedVerses.has(key)
          if (selectionMode) {
            return (
              <button
                type="button"
                key={key}
                className={`collection-verse-row selectable ${v.memorized ? 'memorized' : ''} ${sel ? 'selected' : ''}`}
                onClick={() => toggleVerse(key)}
              >
                <span className="collection-verse-ref">{v.reference}</span>
                <span className="collection-verse-text">{v.text}</span>
                {v.memorized ? (
                  <span className="memorized-badge">
                    <Check size={10} aria-hidden /> Memorizado
                  </span>
                ) : sel ? (
                  <span className="memorized-badge selected-badge">
                    <Check size={10} aria-hidden /> Selecionado
                  </span>
                ) : null}
              </button>
            )
          }
          return (
            <div key={key} className={`collection-verse-row ${v.memorized ? 'memorized' : ''}`}>
              <span className="collection-verse-ref">{v.reference}</span>
              <span className="collection-verse-text">{v.text}</span>
              {v.memorized && (
                <span className="memorized-badge">
                  <Check size={10} aria-hidden /> Memorizado
                </span>
              )}
            </div>
          )
        })}
      </div>

      {selectionMode && (
        <div className="selection-bar collection-selection-bar">
          <div className="selection-bar-info">
            <span className="selection-bar-count">{selectedVerses.size}</span>
            <span className="selection-bar-preview">{selectedVerses.size === 1 ? 'versículo selecionado' : 'versículos selecionados'}</span>
          </div>
          <div className="selection-bar-actions">
            <button type="button" className="btn btn-sm btn-secondary" onClick={exitSelectionMode}>
              Cancelar
            </button>
            {selectedNotMemorizedCount > 0 && (
              <button type="button" className="btn btn-sm btn-primary" onClick={() => void handleAddSelected()} disabled={addingSelected}>
                Adicionar à memória
              </button>
            )}
            {selectedMemorizedCount > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => void handleRemoveFromMemory()}
                disabled={addingSelected}
                title="Esquece os textos selecionados e os tira da fila de revisão"
              >
                Remover da memória
              </button>
            )}
            {isUserCollection && selectedVerses.size > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => void handleRemoveFromCollection()}
                disabled={addingSelected}
              >
                Remover da coleção
              </button>
            )}
          </div>
        </div>
      )}

      {!selectionMode && isUserCollection && (
        <div className="collection-detail-actions">
          <div className="collection-detail-actions-row">
            <button
              type="button"
              className={`btn btn-primary btn-large ${added ? 'btn-added' : ''}`}
              onClick={handleAddAll}
              disabled={adding || added || col.memorized === col.total}
            >
              {adding ? (
                'Adicionando…'
              ) : added ? (
                <>
                  <Check size={16} aria-hidden /> Adicionado
                </>
              ) : col.total === 0 ? (
                'Sem versículos'
              ) : (
                `Adicionar (${col.total - col.memorized})`
              )}
            </button>
            <Link to="/review" className="btn btn-secondary btn-large" aria-label="Revisar esta coleção">
              Revisar
            </Link>
          </div>
          <div className="collection-detail-actions-row">
            <button
              type="button"
              className={`btn btn-secondary ${addedBlock ? 'btn-added' : ''}`}
              onClick={handleAddAsBlock}
              disabled={addingBlock || addedBlock || col.total < 2}
              title="Junta versículos seguidos em um único texto"
            >
              {addingBlock ? (
                'Adicionando…'
              ) : addedBlock ? (
                <>
                  <Check size={14} aria-hidden /> Parágrafo
                </>
              ) : (
                'Por parágrafo'
              )}
            </button>
            <Link to="/collections/$slug/add" params={{ slug: col.slug }} className="btn btn-secondary">
              + Versículos
            </Link>
            <button type="button" className="btn btn-secondary" onClick={() => setShowMemorized(true)}>
              Meus vers.
            </button>
          </div>
          <p className="collection-block-hint">“Por parágrafo” junta versículos seguidos em um único texto para revisar.</p>
        </div>
      )}

      {!selectionMode && !isUserCollection && (
        <div className="collection-detail-actions">
          <div className="collection-detail-actions-row">
            <button
              type="button"
              className={`btn btn-primary btn-large ${added ? 'btn-added' : ''}`}
              onClick={handleAddAll}
              disabled={adding || added || col.memorized === col.total}
            >
              {adding ? (
                'Adicionando…'
              ) : added ? (
                <>
                  <Check size={16} aria-hidden /> Adicionado
                </>
              ) : col.total === 0 ? (
                'Sem versículos'
              ) : (
                `Adicionar (${col.total - col.memorized})`
              )}
            </button>
            <Link to="/review" className="btn btn-secondary btn-large" aria-label="Revisar esta coleção">
              Revisar
            </Link>
          </div>
          <button
            type="button"
            className={`btn btn-secondary btn-large ${addedBlock ? 'btn-added' : ''}`}
            onClick={handleAddAsBlock}
            disabled={addingBlock || addedBlock || col.total < 2}
            title="Junta versículos seguidos em um único texto"
          >
            {addingBlock ? (
              'Adicionando…'
            ) : addedBlock ? (
              <>
                <Check size={16} aria-hidden /> Parágrafo adicionado
              </>
            ) : (
              'Memorizar por parágrafo'
            )}
          </button>
          <p className="collection-block-hint">“Por parágrafo” junta versículos seguidos em um único texto para revisar.</p>
        </div>
      )}

      {isUserCollection && col && (
        <MemorizedVersePickerModal
          isOpen={showMemorized}
          onClose={() => setShowMemorized(false)}
          onSave={handleMemorizedSave}
          collectionId={col.dbId}
        />
      )}

      {isUserCollection && col && (
        <CollectionFormModal
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          onSave={handleEdit}
          collection={{ name: col.name, description: col.description, icon: col.icon, color: col.color }}
        />
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-card modal-confirm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <p className="modal-confirm-text">Tem certeza que deseja excluir esta coleção?</p>
            <p className="modal-confirm-hint">Os versículos da coleção não serão removidos da sua memória.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
