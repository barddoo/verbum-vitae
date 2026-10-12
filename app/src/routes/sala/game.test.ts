import { describe, expect, it } from 'vitest'
import { computeWinner, defaultPlayers, resolveNames, scoreKeyToIndex, shuffle } from './game'

describe('defaultPlayers', () => {
  it('returns two teams', () => {
    expect(defaultPlayers('teams')).toEqual(['Equipe A', 'Equipe B'])
  })
  it('returns 3 individual players by default', () => {
    expect(defaultPlayers('individual')).toEqual(['Jogador 1', 'Jogador 2', 'Jogador 3'])
  })
  it('respects count', () => {
    expect(defaultPlayers('individual', 5)).toHaveLength(5)
  })
})

describe('resolveNames', () => {
  it('falls back on empty names', () => {
    expect(resolveNames('individual', ['Ana', '  ', ''])).toEqual(['Ana', 'Jogador 2', 'Jogador 3'])
    expect(resolveNames('teams', ['', 'Azul'])).toEqual(['Equipe A', 'Azul'])
  })
})

describe('scoreKeyToIndex', () => {
  it('maps Digit1-9 to 0-8', () => {
    expect(scoreKeyToIndex('Digit1')).toBe(0)
    expect(scoreKeyToIndex('Digit9')).toBe(8)
  })
  it('rejects other keys', () => {
    expect(scoreKeyToIndex('Digit0')).toBeNull()
    expect(scoreKeyToIndex('KeyN')).toBeNull()
    expect(scoreKeyToIndex('Numpad1')).toBeNull()
  })
})

describe('computeWinner', () => {
  it('finds single winner', () => {
    expect(computeWinner([1, 3, 2])).toEqual({ indices: [1], tie: false })
  })
  it('detects tie among leaders', () => {
    expect(computeWinner([3, 1, 3])).toEqual({ indices: [0, 2], tie: true })
  })
  it('all zero is a tie', () => {
    expect(computeWinner([0, 0])).toEqual({ indices: [0, 1], tie: true })
  })
})

describe('shuffle', () => {
  it('keeps all items and does not mutate input', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffle(input, () => 0.3)
    expect([...out].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5])
  })
  it('is deterministic for a given rng', () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual(shuffle([1, 2, 3, 4], () => 0))
  })
})
