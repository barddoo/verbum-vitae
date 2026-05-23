import { Link, useParams, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { BOOKS } from 'shared/bible'
import { bundledCollections, verseRefToId } from '../data/collections'
import { db, getCollectionProgress, addCollectionToMemory, parseVerseKey, fetchVersesForKey } from '../lib/db'
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
  const count = await db.collections.where({ isBuiltin: 1 }).count()
  if (count > 0) return
  for (const c of bundledCollections) {
    const existing = await db.collections.where({ name: c.name }).first()
    if (existing) continue
    const colId = await db.collections.put({
      name: c.name,
      description: c.description,
      icon: c.icon,
      isBuiltin: 1,
      createdAt: Date.now(),
    })
    const cId = colId!
    let order = 0
    for (const ref of c.verses) {
      const verseId = verseRefToId(ref)
      const existingCv = await db.collectionVerses
        .where({ collectionId: cId, verseId, translation: 'ara' })
        .first()
      if (existingCv) continue
      if (Array.isArray(ref.verse)) {
        for (let v = ref.verse[0]; v <= ref.verse[1]; v++) {
          const singleId = `${ref.book}_${ref.chapter}_${v}`
          await db.collectionVerses.put({
            collectionId: cId,
            verseId: singleId,
            translation: 'ara',
            sortOrder: order++,
          })
        }
      } else {
        await db.collectionVerses.put({
          collectionId: cId,
          verseId,
          translation: 'ara',
          sortOrder: order++,
        })
      }
    }
  }
}

export function CollectionsListPage() {
  const [collections, setCollections] = useState<CollectionEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    init()
  }, [])

  async function init() {
    await ensureCollectionsSeeded()
    const allCols = await db.collections.toArray()
    const entries: CollectionEntry[] = []
    for (const col of allCols) {
      const { total, memorized, percent } = await getCollectionProgress(col.id!, 'ara')
      entries.push({
        id: col.id!,
        dbId: col.id!,
        name: col.name,
        description: col.description,
        icon: col.icon,
        isBuiltin: col.isBuiltin,
        total,
        memorized,
        percent,
      })
    }
    setCollections(entries)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Carregando...</div>
      </div>
    )
  }

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
                <span className="collection-card-count">{col.memorized}/{col.total}</span>
                <div className="collection-progress-bar">
                  <div
                    className="collection-progress-fill"
                    style={{ width: `${col.percent}%` }}
                  />
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
  const navigate = useNavigate()
  const [col, setCol] = useState<CollectionEntry | null>(null)
  const [verses, setVerses] = useState<{ verseId: string; reference: string; text: string; memorized: boolean }[]>([])
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    const dbId = Number(id)
    const c = await db.collections.get(dbId)
    if (!c) return

    const { total, memorized, percent } = await getCollectionProgress(dbId, 'ara')
    setCol({ id: dbId, dbId, name: c.name, description: c.description, icon: c.icon, isBuiltin: c.isBuiltin, total, memorized, percent })

    const cvs = await db.collectionVerses.where({ collectionId: dbId }).sortBy('sortOrder')
    const memSet = new Set<string>()
    const allProgress = await db.progress.toArray()
    for (const p of allProgress) memSet.add(p.verseId + p.translation)

    const verseList: typeof verses = []
    for (const cv of cvs) {
      const text = await fetchVersesForKey(cv.verseId, cv.translation)
      const parsed = parseVerseKey(cv.verseId)
      const bookName = BOOKS[parsed.bookNumber]
      const ref = parsed.verseEnd
        ? `${bookName} ${parsed.chapter}:${parsed.verseStart}-${parsed.verseEnd}`
        : `${bookName} ${parsed.chapter}:${parsed.verseStart}`
      verseList.push({
        verseId: cv.verseId,
        reference: ref,
        text,
        memorized: memSet.has(cv.verseId + cv.translation),
      })
    }
    setVerses(verseList)
    setLoading(false)
  }

  async function handleAddAll() {
    if (!col) return
    setAdding(true)
    const addedCount = await addCollectionToMemory(col.dbId, 'ara', () => '', logProgressChange)
    setAdded(true)
    setAdding(false)
    await load()
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Carregando...</div>
      </div>
    )
  }

  if (!col) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Coleção não encontrada.</p>
          <Link to="/collections" className="btn btn-secondary">Voltar</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page collection-detail-page">
      <Link to="/collections" className="back-btn">← Coleções</Link>

      <div className="collection-detail-header">
        <span className="collection-detail-icon">{col.icon}</span>
        <h2 className="collection-detail-name">{col.name}</h2>
        <p className="collection-detail-desc">{col.description}</p>
      </div>

      <div className="collection-detail-progress">
        <div className="collection-detail-stats">
          <span>{col.memorized}/{col.total} versículos</span>
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
          className={`btn btn-primary btn-large ${added ? 'btn-added' : ''}`}
          onClick={handleAddAll}
          disabled={adding || added || col.memorized === col.total}
        >
          {adding ? 'Adicionando...' : added || col.memorized === col.total ? '✓ Adicionado' : `Adicionar todos (${col.total - col.memorized})`}
        </button>
      </div>
    </div>
  )
}
