export type TextSourceType = 'bible' | 'creed' | 'catechism'

export interface TextKeyParsed {
  sourceType: TextSourceType
  sourceId: string
  sectionIndex: number
  blockIndex: number
  itemIndex: number
  itemEnd?: number
}

const TEXT_TYPE_CHAR: Record<TextSourceType, string> = { bible: 'b', creed: 'c', catechism: 'k' }
const CHAR_TO_TYPE: Record<string, TextSourceType> = { b: 'bible', c: 'creed', k: 'catechism' }

export function textKey(
  sourceType: TextSourceType,
  sourceId: string,
  section: number,
  block: number,
  item: number,
  itemEnd?: number,
): string {
  const ch = TEXT_TYPE_CHAR[sourceType]
  const coords = itemEnd != null ? `${section}:${block}:${item}:${itemEnd}` : `${section}:${block}:${item}`
  return sourceType === 'bible' ? `${ch}:${coords}` : `${ch}:${sourceId}:${coords}`
}

export function parseTextKey(key: string): TextKeyParsed {
  const parts = key.split(':')
  const typeChar = parts[0]
  const sourceType = CHAR_TO_TYPE[typeChar] || 'bible'

  if (sourceType === 'bible') {
    const [section, block, item, itemEnd] = parts.slice(1).map(Number)
    return { sourceType, sourceId: '', sectionIndex: section, blockIndex: block, itemIndex: item, itemEnd }
  }

  const sourceId = parts[1]
  const [section, block, item, itemEnd] = parts.slice(2).map(Number)
  return {
    sourceType,
    sourceId,
    sectionIndex: section,
    blockIndex: block,
    itemIndex: item || 0,
    itemEnd,
  }
}

export function verseKey(bookNumber: number, chapter: number, verse: number, endVerse?: number): string {
  return textKey('bible', '', bookNumber, chapter, verse, endVerse)
}

export const parseVerseKey = parseTextKey
