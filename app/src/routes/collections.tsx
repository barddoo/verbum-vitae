import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { BOOKS, DEFAULT_TRANSLATION } from 'shared/bible'
import { bundledCollections, verseRefToId } from '../data/collections'
import { addCollectionToMemory, db, fetchVersesBatch, getCollectionProgress, parseVerseKey } from '../lib/db'
import { logProgressChange } from '../lib/sync'

interface CollectionEntry {
  id: number
  dbId: number
  name: string
  description: string
  icon: string
  isBuiltin: number
  total: number
  memorized: number
  percent: number
}

async function ensureCollectionsSeeded() {
  for (const c of bundledCollections) {
    const existing = await db.collections.where({ name: c.name }).first()
    if (existing) continue
    const colId = await db.collections.put({ name: c.name, description: c.description, icon: c.icon, isBuiltin: 1, createdAt: Date.now() })
    const cId = colId!
    let order = 0
    for (const ref of c.verses) {
      const verseId = verseRefToId(ref)
      const existingCv = await db.collectionVerses.where({ collectionId: cId, verseId, translation: 'ara' }).first()
      if (existingCv) continue
      if (Array.isArray(ref.verse)) {
        for (let v = ref.verse[0]; v <= ref.verse[1]; v++) {
          await db.collectionVerses.put({
            collectionId: cId,
            verseId: `${ref.book}_${ref.chapter}_${v}`,
            translation: 'ara',
            sortOrder: order++,
          })
        }
      } else {
        await db.collectionVerses.put({ collectionId: cId, verseId, translation: 'ara', sortOrder: order++ })
      }
    }
  }
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
        const { total, memorized, percent } = await getCollectionProgress(col.id!, 'ara')
        return {
          id: col.id!,
          dbId: col.id!,
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
      <p className="collections-subtitle">Conjuntos de versículos para memorizar</p>
      <div className="collection-grid">
        {collections.map((col) => (
          <Link key={col.dbId} to="/collections/$id" params={{ id: String(col.dbId) }} className="collection-card-link">
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
  const { id } = useParams({ from: '/collections/$id' })
  const _navigate = useNavigate()
  const [col, setCol] = useState<CollectionEntry | null>(null)
  const [verses, setVerses] = useState<{ verseId: string; reference: string; text: string; memorized: boolean }[]>([])
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const dbId = Number(id)
    const c = await db.collections.get(dbId)
    if (!c) return

    const [progressResult, cvs, allProgress] = await Promise.all([
      getCollectionProgress(dbId, 'ara'),
      db.collectionVerses.where({ collectionId: dbId }).sortBy('sortOrder'),
      db.progress.toArray(),
    ])

    setCol({ id: dbId, dbId, name: c.name, description: c.description, icon: c.icon, isBuiltin: c.isBuiltin, ...progressResult })

    const memSet = new Set<string>()
    for (const p of allProgress) memSet.add(p.verseId + p.translation)

    const verseTexts = await fetchVersesBatch(cvs.map((cv) => ({ verseId: cv.verseId, translation: cv.translation })))

    const verseList: typeof verses = []
    for (const cv of cvs) {
      const text = verseTexts.get(cv.verseId) || ''
      const parsed = parseVerseKey(cv.verseId)
      const bookName = BOOKS[parsed.bookNumber]
      const ref = parsed.verseEnd
        ? `${bookName} ${parsed.chapter}:${parsed.verseStart}-${parsed.verseEnd}`
        : `${bookName} ${parsed.chapter}:${parsed.verseStart}`
      verseList.push({ verseId: cv.verseId, reference: ref, text, memorized: memSet.has(cv.verseId + cv.translation) })
    }
    setVerses(verseList)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [id, load])

  async function handleAddAll() {
    if (!col) return
    setAdding(true)
    const userTranslation = (localStorage.getItem('translation') as string | null) ?? DEFAULT_TRANSLATION
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
            {col.memorized}/{col.total} versículos
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
