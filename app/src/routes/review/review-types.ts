export type PracticeMode = 'fill-blank' | 'first-letter' | 'flashcard' | 'typing'
export type CardStateFilter = 'all' | 'new' | 'learning' | 'review'

export const LIMIT_OPTIONS = [5, 10, 20, 50] as const

export const PRACTICE_MODES: { value: PracticeMode; title: string; desc: string }[] = [
  { value: 'fill-blank', title: 'Completar', desc: 'Preencha lacunas' },
  { value: 'first-letter', title: '1ª letra', desc: 'Recite pelas iniciais' },
  { value: 'flashcard', title: 'Flashcard', desc: 'Recite mentalmente' },
  { value: 'typing', title: 'Digitar', desc: 'Digite de memória' },
]

export const modeMeta = (m: PracticeMode) => PRACTICE_MODES.find((p) => p.value === m) ?? PRACTICE_MODES[0]

export interface ReviewItem {
  progressId: number
  verseId: string
  reference: string
  verseText: string
  translation: string
  isQA: boolean
  question?: string
}
