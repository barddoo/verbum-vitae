import type { VerseItem } from './blanks'
import { type Difficulty, tokenize } from './blanks'

export function parseItems(raw: string, difficulty: Difficulty = 'normal'): VerseItem[] {
  return raw
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .flatMap((block) => {
      const lines = block.trim().split('\n')
      let reference = ''
      if (lines[0]?.startsWith('#'))
        reference =
          lines
            .shift()
            ?.replace(/^#+\s*/, '')
            .trim() ?? ''
      const text = lines.join(' ').replace(/\s+/g, ' ').trim()
      return text ? [{ reference, text, tokens: tokenize(text, difficulty) }] : []
    })
}
