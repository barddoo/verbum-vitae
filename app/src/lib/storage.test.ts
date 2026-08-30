// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { cachedGet, cachedRemove, cachedSet } from './storage'

// Use a unique prefix per describe so tests don't share cached values
let keyCount = 0
function freshKey() {
  return `test_storage_${Date.now()}_${++keyCount}`
}

beforeEach(() => {
  localStorage.clear()
})

describe('cachedGet', () => {
  it('returns null for key not in localStorage', () => {
    const k = freshKey()
    expect(cachedGet(k)).toBeNull()
  })

  it('returns the stored value', () => {
    const k = freshKey()
    localStorage.setItem(k, 'hello')
    expect(cachedGet(k)).toBe('hello')
  })

  it('caches the value — survives localStorage removal without cachedRemove', () => {
    const k = freshKey()
    localStorage.setItem(k, 'cached')
    cachedGet(k) // prime the cache
    localStorage.removeItem(k) // remove from storage but NOT via cachedRemove
    expect(cachedGet(k)).toBe('cached') // still returns from in-memory cache
  })

  it('caches null for missing keys', () => {
    const k = freshKey()
    cachedGet(k) // caches null
    localStorage.setItem(k, 'late') // too late — already cached
    expect(cachedGet(k)).toBeNull()
  })
})

describe('cachedSet', () => {
  it('writes to localStorage', () => {
    const k = freshKey()
    cachedSet(k, 'value')
    expect(localStorage.getItem(k)).toBe('value')
  })

  it('updates the cache so cachedGet returns new value immediately', () => {
    const k = freshKey()
    cachedSet(k, 'first')
    cachedSet(k, 'second')
    localStorage.removeItem(k) // bypass storage; cache should still have 'second'
    expect(cachedGet(k)).toBe('second')
  })

  it('overwrites previous cached value', () => {
    const k = freshKey()
    cachedSet(k, 'old')
    cachedSet(k, 'new')
    expect(localStorage.getItem(k)).toBe('new')
  })
})

describe('cachedRemove', () => {
  it('removes from localStorage', () => {
    const k = freshKey()
    localStorage.setItem(k, 'bye')
    cachedRemove(k)
    expect(localStorage.getItem(k)).toBeNull()
  })

  it('removes from cache so cachedGet re-reads localStorage', () => {
    const k = freshKey()
    cachedSet(k, 'cached-value')
    cachedRemove(k)
    // Now localStorage is clear; cachedGet should re-read and return null
    expect(cachedGet(k)).toBeNull()
  })

  it('allows re-setting after removal', () => {
    const k = freshKey()
    cachedSet(k, 'original')
    cachedRemove(k)
    cachedSet(k, 'restored')
    expect(cachedGet(k)).toBe('restored')
  })

  it('is a no-op for keys that were never set', () => {
    const k = freshKey()
    expect(() => cachedRemove(k)).not.toThrow()
    expect(cachedGet(k)).toBeNull()
  })
})
