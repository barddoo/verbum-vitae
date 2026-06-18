import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Check, Pencil, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_TRANSLATION } from 'shared/bible'
import { type CollectionFormData, CollectionFormModal } from '../components/collection-form-modal'
import { MemorizedVersePickerModal } from '../components/memorized-verse-picker-modal'
import { bundledCollections, verseRefToId } from '../data/collections'
import { useSwipeToDelete } from '../hooks/use-swipe'
import {
  addCollectionToMemory,
  addVersesToCollection,
  createUserCollection,
  db,
  deleteUserCollection,
  fetchVersesBatch,
  getCollectionProgress,
  removeVerseFromCollection,
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

async function ensureCollectionsSeeded() {
  const existing = await db.collections.toArray()
  const existingNames = new Set(existing.map((c) => c.name))
  const bundledSlugByName = new Map(bundledCollections.map((c) => [c.name, c.id]))

  await Promise.all(
    existing.filter((c) => !c.slug).map((c) => db.collections.update(c.id!, { slug: bundledSlugByName.get(c.name) || slugify(c.name) })),
  )

  await Promise.all(
    bundledCollections
      .filter((c) => !existingNames.has(c.name))
      .map(async (c) => {
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
      }),
  )
}

const loadingSpinner = <div className="loading">Carregando…</div>

function SwipeableVerseRow({
  verseId,
  reference,
  text,
  memorized,
  collectionId,
  translation,
  onRemoved,
}: {
  verseId: string
  reference: string
  text: string
  memorized: boolean
  collectionId: number
  translation: string
  onRemoved: (verseId: string, translation: string, wasMemoized: boolean) => void
}) {
  const [removing, setRemoving] = useState(false)

  const handleDelete = useCallback(async () => {
    setRemoving(true)
    await removeVerseFromCollection(collectionId, verseId, translation)
    onRemoved(verseId, translation, memorized)
  }, [collectionId, verseId, translation, memorized, onRemoved])

  const swipe = useSwipeToDelete(handleDelete)

  if (removing) return null

  return (
    <div className="swipe-container">
      <div className="swipe-action">Remover</div>
      <div
        className={`swipe-content collection-verse-row ${memorized ? 'memorized' : ''}`}
        style={{ transform: `translateX(${swipe.translateX}px)`, transition: swipe.translateX === 0 ? 'transform 0.2s ease' : 'none' }}
        onPointerDown={swipe.handlePointerDown}
        onPointerMove={swipe.handlePointerMove}
        onPointerUp={swipe.handlePointerUp}
        onPointerCancel={swipe.handlePointerCancel}
      >
        <span className="collection-verse-ref">{reference}</span>
        <span className="collection-verse-text">{text}</span>
        {memorized && (
          <span className="memorized-badge">
            <Check size={10} aria-hidden /> Memorizado
          </span>
        )}
      </div>
    </div>
  )
}

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
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showMemorized, setShowMemorized] = useState(false)

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

  function handleVerseRemoved(verseId: string, translation: string, wasMemoized: boolean) {
    setVerses((prev) => prev.filter((v) => !(v.verseId === verseId && v.translation === translation)))
    setCol((prev) => {
      if (!prev) return prev
      const newTotal = prev.total - 1
      const newMemoized = wasMemoized ? prev.memorized - 1 : prev.memorized
      return { ...prev, total: newTotal, memorized: newMemoized, percent: newTotal > 0 ? Math.round((newMemoized / newTotal) * 100) : 0 }
    })
  }

  async function handleMemorizedSave(versesToAdd: { verseId: string; translation: string }[]) {
    if (!col) return
    await addVersesToCollection(col.dbId, versesToAdd)
    setShowMemorized(false)
    await load()
  }

  const isUserCollection = col && !col.isBuiltin

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
      <div className="collection-detail-topbar">
        <Link to="/collections" className="back-btn">
          ← Coleções
        </Link>
        {isUserCollection && (
          <div className="collection-detail-actions-edit">
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
          </div>
        )}
      </div>

      <div className="collection-detail-header">
        <span className="collection-detail-icon">{col.icon}</span>
        <h2 className="collection-detail-name">{col.name}</h2>
        <p className="collection-detail-desc">{col.description}</p>
      </div>

      <div className="collection-detail-progress">
        <div className="collection-detail-stats">
          <span>
            {col.memorized}/{col.total}
          </span>
          <span>{col.percent}%</span>
        </div>
        <div className="collection-progress-bar detail">
          <div className="collection-progress-fill" style={{ width: `${col.percent}%` }} />
        </div>
      </div>

      {isUserCollection && verses.length > 0 && (
        <p className="collection-swipe-hint">← Deslize para a esquerda para remover um versículo</p>
      )}

      <div className="collection-verse-list">
        {verses.map((v) =>
          isUserCollection ? (
            <SwipeableVerseRow
              key={`${v.verseId}-${v.translation}`}
              verseId={v.verseId}
              reference={v.reference}
              text={v.text}
              memorized={v.memorized}
              collectionId={col.dbId}
              translation={v.translation}
              onRemoved={handleVerseRemoved}
            />
          ) : (
            <div key={`${v.verseId}-${v.translation}`} className={`collection-verse-row ${v.memorized ? 'memorized' : ''}`}>
              <span className="collection-verse-ref">{v.reference}</span>
              <span className="collection-verse-text">{v.text}</span>
              {v.memorized && (
                <span className="memorized-badge">
                  <Check size={10} aria-hidden /> Memorizado
                </span>
              )}
            </div>
          ),
        )}
      </div>

      {isUserCollection && (
        <div className="collection-detail-actions">
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
              `Adicionar à memória (${col.total - col.memorized})`
            )}
          </button>
          <div className="collection-detail-actions-row">
            <Link to="/collections/$slug/add" params={{ slug: col.slug }} className="btn btn-secondary">
              + Versículos
            </Link>
            <button type="button" className="btn btn-secondary" onClick={() => setShowMemorized(true)}>
              Meus versículos
            </button>
          </div>
        </div>
      )}

      {!isUserCollection && (
        <div className="collection-detail-actions">
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
              `Adicionar todos (${col.total - col.memorized})`
            )}
          </button>
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
