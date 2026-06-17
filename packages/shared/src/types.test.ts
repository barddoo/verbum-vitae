import { describe, expect, it } from 'vitest'
import {
  CollectionSchema,
  CollectionVerseSchema,
  LoginRequest,
  ProgressSchema,
  RegisterRequest,
  SyncPullRequest,
  SyncPushRequest,
  VerseSchema,
} from './types'

describe('VerseSchema', () => {
  it('accepts valid bible verse', () => {
    const result = VerseSchema.safeParse({
      sourceType: 'bible',
      sourceId: '',
      bookNumber: 42,
      chapter: 3,
      verse: 16,
      text: 'Porque Deus amou o mundo',
      translation: 'nvi',
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative bookNumber', () => {
    const result = VerseSchema.safeParse({
      sourceType: 'bible',
      sourceId: '',
      bookNumber: -1,
      chapter: 1,
      verse: 1,
      text: '',
      translation: 'nvi',
    })
    expect(result.success).toBe(false)
  })

  it('rejects chapter 0', () => {
    const result = VerseSchema.safeParse({
      sourceType: 'bible',
      sourceId: '',
      bookNumber: 1,
      chapter: 0,
      verse: 1,
      text: '',
      translation: 'nvi',
    })
    expect(result.success).toBe(false)
  })

  it('accepts verse 0', () => {
    const result = VerseSchema.safeParse({
      sourceType: 'bible',
      sourceId: '',
      bookNumber: 1,
      chapter: 1,
      verse: 0,
      text: '',
      translation: 'nvi',
    })
    expect(result.success).toBe(true)
  })
})

describe('ProgressSchema', () => {
  it('accepts valid progress', () => {
    const result = ProgressSchema.safeParse({
      verseId: 'b:42:3:16',
      translation: 'nvi',
      cardJson: '{}',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-iso datetime', () => {
    const result = ProgressSchema.safeParse({
      verseId: 'b:42:3:16',
      translation: 'nvi',
      cardJson: '{}',
      updatedAt: 'not-a-date',
    })
    expect(result.success).toBe(false)
  })
})

describe('RegisterRequest', () => {
  it('accepts valid email and password', () => {
    const result = RegisterRequest.safeParse({ email: 'test@example.com', password: 'password123' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = RegisterRequest.safeParse({ email: 'not-email', password: 'password123' })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 8 chars', () => {
    const result = RegisterRequest.safeParse({ email: 'test@example.com', password: '1234567' })
    expect(result.success).toBe(false)
  })
})

describe('LoginRequest', () => {
  it('accepts valid email and password', () => {
    const result = LoginRequest.safeParse({ email: 'test@example.com', password: 'any' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = LoginRequest.safeParse({ email: '', password: 'any' })
    expect(result.success).toBe(false)
  })
})

describe('SyncPushRequest', () => {
  it('accepts valid entries', () => {
    const result = SyncPushRequest.safeParse({
      entries: [{ tableName: 'progress', rowId: 'v1', operation: 'create', data: '{}' }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty entries array', () => {
    const result = SyncPushRequest.safeParse({ entries: [] })
    expect(result.success).toBe(true)
  })

  it('rejects invalid operation', () => {
    const result = SyncPushRequest.safeParse({
      entries: [{ tableName: 'progress', rowId: 'v1', operation: 'invalid', data: '{}' }],
    })
    expect(result.success).toBe(false)
  })
})

describe('SyncPullRequest', () => {
  it('accepts empty object', () => {
    const result = SyncPullRequest.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts cursor string', () => {
    const result = SyncPullRequest.safeParse({ cursor: '2026-01-01|abc' })
    expect(result.success).toBe(true)
  })
})

describe('CollectionSchema', () => {
  it('accepts valid collection', () => {
    const result = CollectionSchema.safeParse({
      slug: 'meus-versiculos',
      name: 'Meus Versículos',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects slug longer than 80 chars', () => {
    const result = CollectionSchema.safeParse({
      slug: 'a'.repeat(81),
      name: 'Test',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(result.success).toBe(false)
  })

  it('applies defaults for description, icon, isBuiltin', () => {
    const result = CollectionSchema.parse({
      slug: 'test',
      name: 'Test',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(result.description).toBe('')
    expect(result.icon).toBe('📖')
    expect(result.isBuiltin).toBe(0)
  })
})

describe('CollectionVerseSchema', () => {
  it('accepts valid verse', () => {
    const result = CollectionVerseSchema.safeParse({
      verseId: 'b:42:3:16',
      translation: 'nvi',
    })
    expect(result.success).toBe(true)
  })

  it('applies default sortOrder', () => {
    const result = CollectionVerseSchema.parse({ verseId: 'b:42:3:16', translation: 'nvi' })
    expect(result.sortOrder).toBe(0)
  })
})
