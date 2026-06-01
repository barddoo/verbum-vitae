import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_TRANSLATION } from 'shared/bible'
import { bundledCollections, verseRefToId } from '../data/collections'
import { addCollectionToMemory, db, fetchVersesBatch, getCollectionProgress } from '../lib/db'
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

export function CollectionsListPage() {
  const [collections, setCollections] = useState<CollectionEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    init()
  }, [])

  async function init() {
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
          isBuiltin: col.isBuiltin,
          total,
          memorized,
          percent,
        }
      }),
    )
    setCollections(entries)
    setLoading(false)
  }

  if (loading) return <div className="page">{loadingSpinner}</div>

  return (
    <div className="page collections-page">
      <h2 className="collections-title">Coleções</h2>
      <p className="collections-subtitle">Conjuntos de textos para memorizar</p>
      <div className="collection-grid">
        {collections.map((col) => (
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
      {collections.length === 0 && (
        <div className="empty-state">
          <p>Nenhuma coleção encontrada.</p>
        </div>
      )}
    </div>
  )
}

export function CollectionDetailPage() {
  const { slug } = useParams({ from: '/collections/$slug' })
  const _navigate = useNavigate()
  const [col, setCol] = useState<CollectionEntry | null>(null)
  const [verses, setVerses] = useState<{ verseId: string; reference: string; text: string; memorized: boolean }[]>([])
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [loading, setLoading] = useState(true)

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
      verseList.push({ verseId: cv.verseId, reference: ref, text, memorized: memSet.has(cv.verseId + cv.translation) })
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
    const _addedCount = await addCollectionToMemory(col.dbId, userTranslation, () => '', logProgressChange)
    setAdded(true)
    setAdding(false)
    await load()
  }

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
      <Link to="/collections" className="back-btn">
        ← Coleções
      </Link>
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
      <div className="collection-verse-list">
        {verses.map((v) => (
          <div key={v.verseId} className={`collection-verse-row ${v.memorized ? 'memorized' : ''}`}>
            <span className="collection-verse-ref">{v.reference}</span>
            <span className="collection-verse-text">{v.text}</span>
            {v.memorized && <span className="memorized-badge">Memorizado</span>}
          </div>
        ))}
      </div>
      <div className="collection-detail-actions">
        <button
          type="button"
          className={`btn btn-primary btn-large ${added ? 'btn-added' : ''}`}
          onClick={handleAddAll}
          disabled={adding || added || col.memorized === col.total}
        >
          {adding
            ? 'Adicionando…'
            : added || col.memorized === col.total
              ? '✓ Adicionado'
              : `Adicionar todos (${col.total - col.memorized})`}
        </button>
      </div>
    </div>
  )
}
