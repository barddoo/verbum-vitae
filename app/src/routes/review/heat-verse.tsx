import { memo } from 'react'

export const HeatVerse = memo(function HeatVerse({ words, heat }: { words: string[]; heat: { index: number; accuracy: number }[] }) {
  return (
    <p className="flashcard-verse heat-verse">
      {words.map((w, i) => {
        const h = heat.find((h) => h.index === i)
        let cls = ''
        if (h && h.accuracy >= 0) {
          if (h.accuracy >= 0.8) cls = 'heat-good'
          else if (h.accuracy >= 0.5) cls = 'heat-ok'
          else cls = 'heat-bad'
        }
        return (
          <span key={`${w}-${i}`} className={cls}>
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </p>
  )
})
