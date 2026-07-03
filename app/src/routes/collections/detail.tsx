import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Check, Pencil, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_TRANSLATION } from 'shared/bible'
import { type CollectionFormData, CollectionFormModal } from '../../components/collection-form-modal'
import { MemorizedVersePickerModal } from '../../components/memorized-verse-picker-modal'
import { PageMeta } from '../../components/page-meta'
import {
  addCollectionToMemory,
  addVersesToCollection,
  db,
  deleteUserCollection,
  fetchVersesBatch,
  getCollectionProgress,
  updateUserCollection,
} from '../../lib/db'
import { verseIdToReference } from '../../lib/format'
import { cachedGet } from '../../lib/storage'
import { logProgressChange } from '../../lib/sync'
import type { CollectionEntry } from './list'
import { SwipeableVerseRow } from './swipeable-verse-row'

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

  if (loading)
    return (
      <div className="page">
        <div className="loading">
          <Trans>Carregando…</Trans>
        </div>
      </div>
    )

  if (!col)
    return (
      <div className="page">
        <div className="empty-state">
          <p>
            <Trans>Coleção não encontrada.</Trans>
          </p>
          <Link to="/collections" className="btn btn-secondary">
            <Trans>Voltar</Trans>
          </Link>
        </div>
      </div>
    )

  return (
    <div className="page collection-detail-page">
      <PageMeta
        title={col ? t`${col.name} · Verbum Vitae` : t`Coleção · Verbum Vitae`}
        description={
          col ? t`Revise e gerencie os versículos da coleção "${col.name}".` : t`Detalhes da coleção de versículos para memorização.`
        }
        path={`/collections/${slug}`}
      />
      <div className="collection-detail-topbar">
        <Link to="/collections" className="back-btn">
          <Trans>← Coleções</Trans>
        </Link>
        {isUserCollection && (
          <div className="collection-detail-actions-edit">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setShowEdit(true)}
              aria-label={t`Editar coleção`}
              title={t`Editar`}
            >
              <Pencil size={14} aria-hidden />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary btn-danger"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label={t`Excluir coleção`}
              title={t`Excluir`}
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
        <p className="collection-swipe-hint">
          <Trans>← Deslize para a esquerda para remover um versículo</Trans>
        </p>
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
                  <Check size={10} aria-hidden /> <Trans>Memorizado</Trans>
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
              <Trans>Adicionando…</Trans>
            ) : added ? (
              <>
                <Check size={16} aria-hidden /> <Trans>Adicionado</Trans>
              </>
            ) : col.total === 0 ? (
              <Trans>Sem versículos</Trans>
            ) : (
              t`Adicionar à memória (${col.total - col.memorized})`
            )}
          </button>
          <div className="collection-detail-actions-row">
            <Link to="/collections/$slug/add" params={{ slug: col.slug }} className="btn btn-secondary">
              <Trans>+ Versículos</Trans>
            </Link>
            <button type="button" className="btn btn-secondary" onClick={() => setShowMemorized(true)}>
              <Trans>Meus versículos</Trans>
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
              <Trans>Adicionando…</Trans>
            ) : added ? (
              <>
                <Check size={16} aria-hidden /> <Trans>Adicionado</Trans>
              </>
            ) : col.total === 0 ? (
              <Trans>Sem versículos</Trans>
            ) : (
              t`Adicionar todos (${col.total - col.memorized})`
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
            <p className="modal-confirm-text">
              <Trans>Tem certeza que deseja excluir esta coleção?</Trans>
            </p>
            <p className="modal-confirm-hint">
              <Trans>Os versículos da coleção não serão removidos da sua memória.</Trans>
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                <Trans>Cancelar</Trans>
              </button>
              <button type="button" className="btn btn-primary btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Trans>Excluindo…</Trans> : <Trans>Excluir</Trans>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
