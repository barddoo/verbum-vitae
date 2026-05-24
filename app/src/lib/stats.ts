export function computeStreak(timestamps: number[]) {
  const days = [...new Set(timestamps.map((ts) => new Date(ts).toDateString()))].toSorted(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  )
  let streak = 0
  const today = new Date().toDateString()
  let expected = new Date(today).getTime()

  for (const dayStr of days) {
    const dayTime = new Date(dayStr).getTime()
    if (dayTime === expected) {
      streak++
      expected -= 86400000
    } else if (dayTime < expected) {
      break
    }
  }

  if (!days.includes(today) && !days.includes(new Date(Date.now() - 86400000).toDateString())) {
    streak = 0
  }

  return streak
}
