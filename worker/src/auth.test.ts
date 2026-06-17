import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './auth'

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
