import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_TRANSLATION } from 'shared/bible'
import { type CollectionFormData, CollectionFormModal } from '../../components/collection-form-modal'
import { PageMeta } from '../../components/page-meta'
import { bundledCollections, verseRefToId } from '../../data/collections'
import { createUserCollection, db, getCollectionProgress } from '../../lib/db'
import { slugify } from '../../lib/slugify'

export interface CollectionEntry {
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

export async function ensureCollectionsSeeded() {
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

  if (loading)
    return (
      <div className="page">
        <div className="loading">
          <Trans>Carregando…</Trans>
        </div>
      </div>
    )

  return (
    <div className="page collections-page">
      <PageMeta
        title={t`Coleções · Verbum Vitae`}
        description={t`Crie e gerencie coleções de versículos para memorizar. Organize seus versículos favoritos por temas e acompanhe seu progresso.`}
        path="/collections"
      />
      <h2 className="collections-title">
        <Trans>Coleções</Trans>
      </h2>
      <p className="collections-subtitle">
        <Trans>Conjuntos de textos para memorizar</Trans>
      </p>

      <button type="button" className="btn btn-primary btn-collection-create" onClick={() => setShowForm(true)}>
        <Trans>+ Criar coleção</Trans>
      </button>

      {userCollections.length > 0 && (
        <>
          <h3 className="collection-section-title">
            <Trans>Suas coleções</Trans>
          </h3>
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
          <h3 className="collection-section-title">
            <Trans>Coleções integradas</Trans>
          </h3>
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
          <p>
            <Trans>Nenhuma coleção encontrada.</Trans>
          </p>
        </div>
      )}

      <CollectionFormModal isOpen={showForm} onClose={() => setShowForm(false)} onSave={handleCreate} />
    </div>
  )
}
