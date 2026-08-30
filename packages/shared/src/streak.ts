/**
 * Consecutive days of review activity, counting back from today.
 *
 * A streak stays alive while today has no activity yet — it only breaks once
 * yesterday is also empty. Accepts epoch millis (client) or date strings (worker).
 */
export function computeStreak(dates: (string | number | null | undefined)[]): number {
  // Already a fresh array from the Set spread, so sorting in place is safe.
  const days = [...new Set(dates.filter((d) => d != null).map((d) => new Date(d).toDateString()))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  )

  if (days.length === 0) return 0

  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  if (!days.includes(today) && !days.includes(yesterday)) return 0

  const startDay = days.includes(today) ? today : yesterday
  let streak = 0
  let expected = new Date(startDay).getTime()

  for (const dayStr of days) {
    const dayTime = new Date(dayStr).getTime()
    if (dayTime === expected) {
      streak++
      expected -= 86400000
    } else if (dayTime < expected) {
      break
    }
  }

  return streak
}
