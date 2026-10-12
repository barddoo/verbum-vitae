export type Mode = 'teams' | 'individual'

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 9
export const DEFAULT_INDIVIDUAL = 3

export function defaultPlayers(mode: Mode, count = DEFAULT_INDIVIDUAL): string[] {
  if (mode === 'teams') return ['Equipe A', 'Equipe B']
  return Array.from({ length: count }, (_, i) => `Jogador ${i + 1}`)
}

export function resolveNames(mode: Mode, names: string[]): string[] {
  const fallback = defaultPlayers(mode, names.length)
  return names.map((n, i) => n.trim() || fallback[i] || `Jogador ${i + 1}`)
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function scoreKeyToIndex(code: string): number | null {
  const m = /^Digit([1-9])$/.exec(code)
  return m ? Number(m[1]) - 1 : null
}

export function computeWinner(scores: number[]): { indices: number[]; tie: boolean } {
  const max = Math.max(...scores)
  const indices = scores.flatMap((s, i) => (s === max ? [i] : []))
  return { indices, tie: indices.length > 1 }
}
