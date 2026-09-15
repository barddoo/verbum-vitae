export function streakMessage(streak: number): string {
  if (streak === 1) return 'Primeiro dia — continue assim!'
  if (streak < 7) return `${streak} dias seguidos — bom começo!`
  if (streak < 30) return `${streak} dias seguidos — continue assim!`
  return `${streak} dias seguidos — impressionante!`
}
