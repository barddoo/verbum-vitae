import { db } from './schema'

export async function recordWordAccuracy(
  verseId: string,
  translation: string,
  correctWords: Set<number>,
  incorrectWords: Set<number>,
  allWords: string[],
) {
  await Promise.all([
    ...[...correctWords].map(async (idx) => {
      const existing = await db.wordStats.where({ verseId, translation, wordIndex: idx }).first()
      if (existing) await db.wordStats.update(existing.id!, { correctCount: existing.correctCount + 1 })
      else
        await db.wordStats.put({
          verseId,
          translation,
          wordIndex: idx,
          word: allWords[idx] || '',
          correctCount: 1,
          incorrectCount: 0,
        })
    }),
    ...[...incorrectWords].map(async (idx) => {
      const existing = await db.wordStats.where({ verseId, translation, wordIndex: idx }).first()
      if (existing) await db.wordStats.update(existing.id!, { incorrectCount: existing.incorrectCount + 1 })
      else
        await db.wordStats.put({
          verseId,
          translation,
          wordIndex: idx,
          word: allWords[idx] || '',
          correctCount: 0,
          incorrectCount: 1,
        })
    }),
  ])
}

export async function getWordHeat(verseId: string, translation: string, wordCount: number): Promise<{ index: number; accuracy: number }[]> {
  const stats = await db.wordStats.where({ verseId, translation }).toArray()
  const map = new Map(stats.map((s) => [s.wordIndex, s]))
  const result: { index: number; accuracy: number }[] = []
  for (let i = 0; i < wordCount; i++) {
    const s = map.get(i)
    if (s && s.correctCount + s.incorrectCount > 0) {
      result.push({ index: i, accuracy: s.correctCount / (s.correctCount + s.incorrectCount) })
    } else {
      result.push({ index: i, accuracy: -1 })
    }
  }
  return result
}
