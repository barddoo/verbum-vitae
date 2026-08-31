import { describe, expect, it } from 'vitest'
import { hashPassword, isPasswordLeaked, parseLeakedCheckHeader, verifyPassword } from './auth'

describe('hashPassword', () => {
  it('returns salt:hash format', async () => {
    const result = await hashPassword('test-password')
    expect(result).toContain(':')
    const [salt, hash] = result.split(':')
    expect(salt).toHaveLength(32)
    expect(hash).toHaveLength(64)
  })
})

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('correct-password')
    const result = await verifyPassword('correct-password', hash)
    expect(result).toBe(true)
  })

  it('returns false for incorrect password', async () => {
    const hash = await hashPassword('correct-password')
    const result = await verifyPassword('wrong-password', hash)
    expect(result).toBe(false)
  })

  it('returns false for invalid stored format', async () => {
    const result = await verifyPassword('any', 'not-valid-format')
    expect(result).toBe(false)
  })

  it('produces different hashes for same password', async () => {
    const h1 = await hashPassword('same')
    const h2 = await hashPassword('same')
    expect(h1).not.toBe(h2)
    expect(await verifyPassword('same', h1)).toBe(true)
    expect(await verifyPassword('same', h2)).toBe(true)
  })
})

describe('parseLeakedCheckHeader', () => {
  it('maps header values to match types', () => {
    expect(parseLeakedCheckHeader('1')).toBe('pair')
    expect(parseLeakedCheckHeader('2')).toBe('username')
    expect(parseLeakedCheckHeader('3')).toBe('similar')
    expect(parseLeakedCheckHeader('4')).toBe('password')
  })

  it('returns null when header is absent or unknown', () => {
    expect(parseLeakedCheckHeader(undefined)).toBeNull()
    expect(parseLeakedCheckHeader('0')).toBeNull()
    expect(parseLeakedCheckHeader('')).toBeNull()
  })
})

describe('isPasswordLeaked', () => {
  it('is true for password-related leaks', () => {
    expect(isPasswordLeaked('pair')).toBe(true)
    expect(isPasswordLeaked('similar')).toBe(true)
    expect(isPasswordLeaked('password')).toBe(true)
  })

  it('is false for username-only leak or no leak', () => {
    expect(isPasswordLeaked('username')).toBe(false)
    expect(isPasswordLeaked(null)).toBe(false)
  })
})
