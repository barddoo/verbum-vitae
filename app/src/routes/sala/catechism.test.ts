import { describe, expect, it } from 'vitest'
import { CATECHISM, catechismItems } from './catechism'

describe('catechismItems', () => {
  it('selects inclusive range with question numbers', () => {
    const items = catechismItems(2, 4, false)
    expect(items.map((i) => i.reference)).toEqual(['Pergunta 2', 'Pergunta 3', 'Pergunta 4'])
    expect(items[0].question).toBe(CATECHISM[1].q)
    expect(items[0].showQuestion).toBe(false)
  })
  it('swaps reversed range', () => {
    expect(catechismItems(3, 1, true)).toHaveLength(3)
  })
  it('creates blanks from answers', () => {
    expect(catechismItems(1, 1, false)[0].tokens.some((t) => t.isBlank)).toBe(true)
  })
})

describe('catechismItems shuffle and difficulty', () => {
  it('shuffles order but keeps reference numbers matching content', () => {
    const items = catechismItems(1, 5, false, 'normal', () => 0)
    expect(items.map((i) => i.reference).sort()).toEqual(['Pergunta 1', 'Pergunta 2', 'Pergunta 3', 'Pergunta 4', 'Pergunta 5'])
    for (const i of items) expect(i.question).toBe(CATECHISM[Number(i.reference.split(' ')[1]) - 1].q)
  })
  it('hard has more blanks than easy', () => {
    const n = (d: 'easy' | 'hard') => catechismItems(8, 8, false, d)[0].tokens.filter((t) => t.isBlank).length
    expect(n('hard')).toBeGreaterThan(n('easy'))
  })
})
