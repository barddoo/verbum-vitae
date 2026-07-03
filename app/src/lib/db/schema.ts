import Dexie, { type EntityTable } from 'dexie'
import type { VerseRow } from 'shared/types'

export interface TextItem extends VerseRow {
  id?: number
}

export interface Progress {
  id?: number
  verseId: string
  translation: string
  cardJson: string
  state: number
  dueDate: number
  streak: number
  updatedAt: number
}

export interface Collection {
  id?: number
  slug: string
  name: string
  description: string
  icon: string
  color?: string
  isBuiltin: number
  createdAt: number
}

export interface CollectionVerse {
  id?: number
  collectionId: number
  verseId: string
  translation: string
  sortOrder: number
}

export interface WordStats {
  id?: number
  verseId: string
  translation: string
  wordIndex: number
  word: string
  correctCount: number
  incorrectCount: number
}

export interface SyncLog {
  id?: number
  userId: string
  tableName: string
  rowId: string
  operation: 'create' | 'update' | 'delete'
  data: string
  synced: number
  createdAt: number
}

export const db = new Dexie('RememberBible') as Dexie & {
  verses: EntityTable<TextItem, 'id'>
  progress: EntityTable<Progress, 'id'>
  wordStats: EntityTable<WordStats, 'id'>
  collections: EntityTable<Collection, 'id'>
  collectionVerses: EntityTable<CollectionVerse, 'id'>
  syncLog: EntityTable<SyncLog, 'id'>
}

db.version(3).stores({
  verses: '++id, &[bookNumber+chapter+verse+translation], [bookNumber+chapter], bookNumber, translation',
  progress: '++id, &[verseId+translation], dueDate, state, [dueDate+state]',
  wordStats: '++id, &[verseId+translation+wordIndex], [verseId+translation]',
  collections: '++id, &name, isBuiltin',
  collectionVerses: '++id, &[collectionId+verseId+translation], collectionId',
  syncLog: '++id, userId, tableName, rowId, synced, createdAt',
})

db.version(4).stores({
  verses: '++id, &[bookNumber+chapter+verse+translation], [bookNumber+chapter], bookNumber, translation',
  progress: '++id, &[verseId+translation], dueDate, state, [dueDate+state], translation',
  wordStats: '++id, &[verseId+translation+wordIndex], [verseId+translation]',
  collections: '++id, &name, isBuiltin',
  collectionVerses: '++id, &[collectionId+verseId+translation], collectionId',
  syncLog: '++id, userId, tableName, rowId, synced, createdAt',
})

db.version(5).stores({
  verses: '++id, &[bookNumber+chapter+verse+translation], [bookNumber+chapter], bookNumber, translation',
  progress: '++id, &[verseId+translation], dueDate, state, [dueDate+state], translation',
  wordStats: '++id, &[verseId+translation+wordIndex], [verseId+translation]',
  collections: '++id, &slug, &name, isBuiltin',
  collectionVerses: '++id, &[collectionId+verseId+translation], collectionId',
  syncLog: '++id, userId, tableName, rowId, synced, createdAt',
})

db.version(6)
  .stores({
    verses:
      '++id, &[sourceType+sourceId+bookNumber+chapter+verse+translation], [sourceType+sourceId+bookNumber+chapter], sourceType, translation, [sourceType+sourceId+translation], [sourceType+sourceId+bookNumber+translation]',
    progress: '++id, &[verseId+translation], dueDate, state, [dueDate+state], translation',
    wordStats: '++id, &[verseId+translation+wordIndex], [verseId+translation]',
    collections: '++id, &slug, &name, isBuiltin',
    collectionVerses: '++id, &[collectionId+verseId+translation], collectionId',
    syncLog: '++id, userId, tableName, rowId, synced, createdAt',
  })
  .upgrade(async (tx) => {
    const oldKey = (vk: string) => `b:${vk.replace(/_/g, ':')}`

    await tx.table('verses').toCollection().modify({ sourceType: 'b', sourceId: '' })
    await tx
      .table('progress')
      .toCollection()
      .modify((p) => {
        p.verseId = oldKey(p.verseId)
      })
    await tx
      .table('wordStats')
      .toCollection()
      .modify((s) => {
        s.verseId = oldKey(s.verseId)
      })
    await tx
      .table('collectionVerses')
      .toCollection()
      .modify((cv) => {
        cv.verseId = oldKey(cv.verseId)
      })
    await tx
      .table('syncLog')
      .toCollection()
      .modify((log) => {
        log.rowId = oldKey(log.rowId)
      })
  })

db.version(7).upgrade(async (tx) => {
  await tx
    .table('verses')
    .where({ sourceType: 'b', sourceId: '', translation: 'kjv' })
    .modify((verse) => {
      verse.text = verse.text.replace(/\d+/g, '').replace(/\s+/g, ' ').trim()
    })
})
