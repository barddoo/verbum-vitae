import { describe, expect, it } from 'vitest'
import { tokenize } from './blanks'

const text = 'Deus criou todas as coisas visíveis invisíveis perfeitas gloriosas eternas maravilhosas'
const count = (d: 'easy' | 'normal' | 'hard') => tokenize(text, d).filter((t) => t.isBlank).length

describe('tokenize difficulty', () => {
  it('easy < normal < hard', () => {
    expect(count('easy')).toBeLessThan(count('normal'))
    expect(count('normal')).toBeLessThan(count('hard'))
  })
  it('hard hides every content word', () => {
    expect(count('hard')).toBe(9)
  })
})
