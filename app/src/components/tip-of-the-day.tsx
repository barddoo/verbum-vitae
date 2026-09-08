import { Lightbulb } from 'lucide-react'
import { dailyTip } from '../data/memorization-tips'

export function TipOfTheDay() {
  const tip = dailyTip()

  return (
    <p className="review-tip">
      <Lightbulb size={16} className="review-tip-icon" aria-hidden="true" />
      <span>
        <strong>Dica:</strong> {tip.text} <a href="/dicas">Ver todas</a>
      </span>
    </p>
  )
}
