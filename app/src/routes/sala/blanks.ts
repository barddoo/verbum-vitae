const STOP_WORDS = new Set([
  'o',
  'a',
  'os',
  'as',
  'de',
  'da',
  'do',
  'dos',
  'das',
  'em',
  'um',
  'uma',
  'uns',
  'umas',
  'que',
  'e',
  'é',
  'com',
  'se',
  'por',
  'para',
  'mas',
  'ao',
  'aos',
  'à',
  'às',
  'no',
  'na',
  'nos',
  'nas',
  'num',
  'numa',
  'seu',
  'sua',
  'seus',
  'suas',
  'lhe',
  'lhes',
  'me',
  'te',
  'eu',
  'tu',
  'ele',
  'ela',
  'nós',
  'eles',
  'elas',
  'vós',
  'vos',
  'como',
  'mais',
  'já',
  'até',
  'mesmo',
  'também',
  'quando',
  'então',
  'porque',
  'pois',
  'isso',
  'este',
  'esta',
  'esse',
  'essa',
  'aquele',
  'aquela',
  'dele',
  'dela',
  'será',
  'são',
  'foi',
  'era',
  'há',
  'ter',
  'ser',
  'tem',
  'têm',
  'não',
  'sim',
])

export interface WordToken {
  raw: string
  isBlank: boolean
  blankIndex: number
}

export interface VerseItem {
  reference: string
  text: string
  tokens: WordToken[]
  question?: string
  showQuestion?: boolean
}

export type Difficulty = 'easy' | 'normal' | 'hard'

export function tokenize(text: string, difficulty: Difficulty = 'normal'): WordToken[] {
  const rawWords = text.split(/\s+/).filter(Boolean)

  const contentIndices: number[] = []
  for (let i = 0; i < rawWords.length; i++) {
    const clean = rawWords[i].replace(/[.,;:!?'"()«»—–]/g, '').toLowerCase()
    if (clean.length >= 3 && !STOP_WORDS.has(clean)) contentIndices.push(i)
  }

  const n = contentIndices.length
  const target =
    difficulty === 'hard'
      ? n
      : difficulty === 'easy'
        ? Math.min(3, Math.max(1, Math.round(n / 5)))
        : Math.min(5, Math.max(2, Math.round(n / 3)))
  const blankWordIndices = new Set<number>()

  if (contentIndices.length >= 2) {
    const step = contentIndices.length / target
    for (let i = 0; i < target; i++) {
      const pick = Math.round(i * step + step / 2)
      blankWordIndices.add(contentIndices[Math.min(pick, contentIndices.length - 1)])
    }
  } else if (contentIndices.length === 1) {
    blankWordIndices.add(contentIndices[0])
  }

  let blankIndex = 0
  return rawWords.map((raw, i) => {
    const isBlank = blankWordIndices.has(i)
    return { raw, isBlank, blankIndex: isBlank ? blankIndex++ : -1 }
  })
}
