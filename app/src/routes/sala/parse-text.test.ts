import { describe, expect, it } from 'vitest'
import { parseItems } from './parse-text'

describe('parseItems', () => {
  it('returns [] for empty input', () => {
    expect(parseItems('')).toEqual([])
    expect(parseItems('  \n\n  ')).toEqual([])
  })

  it('parses a single block without reference', () => {
    const [item] = parseItems('Deus é amor e justiça')
    expect(item.reference).toBe('')
    expect(item.text).toBe('Deus é amor e justiça')
    expect(item.tokens.some((t) => t.isBlank)).toBe(true)
  })

  it('splits blocks on blank lines, including CRLF and extra blanks', () => {
    const items = parseItems('Primeiro texto aqui\r\n\r\n\r\nSegundo texto aqui\n   \nTerceiro texto')
    expect(items.map((i) => i.text)).toEqual(['Primeiro texto aqui', 'Segundo texto aqui', 'Terceiro texto'])
  })

  it('extracts # title as reference and joins remaining lines', () => {
    const [item] = parseItems('# Pergunta 9\nNo primeiro, que conheçamos\ne confiemos em Deus.')
    expect(item.reference).toBe('Pergunta 9')
    expect(item.text).toBe('No primeiro, que conheçamos e confiemos em Deus.')
  })

  it('drops blocks that only have a title', () => {
    expect(parseItems('# Só título')).toEqual([])
  })
})
