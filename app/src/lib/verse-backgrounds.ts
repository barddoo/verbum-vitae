export type Background =
  | { kind: 'photo'; id: string; thumb: string; full: string; name: string }
  | { kind: 'gradient'; id: string; stops: [string, string]; name: string }

export const GRADIENTS: Extract<Background, { kind: 'gradient' }>[] = [
  { kind: 'gradient', id: 'ink', stops: ['#0f1117', '#1a1f2e'], name: 'Tinta' },
  { kind: 'gradient', id: 'deep-purple', stops: ['#1a1f2e', '#2d1f3d'], name: 'Púrpura' },
  { kind: 'gradient', id: 'forest', stops: ['#1a1f2e', '#1a3a2a'], name: 'Floresta' },
  { kind: 'gradient', id: 'earth', stops: ['#1a1f2e', '#3a2a1a'], name: 'Terra' },
  { kind: 'gradient', id: 'twilight', stops: ['#2d1a2d', '#1a2d3a'], name: 'Crepúsculo' },
  { kind: 'gradient', id: 'ocean', stops: ['#1a2a3a', '#0f3a2a'], name: 'Oceano' },
  { kind: 'gradient', id: 'sunset', stops: ['#3a1a1a', '#1a1a3a'], name: 'Pôr do Sol' },
  { kind: 'gradient', id: 'olive', stops: ['#1a1f2e', '#2a2a1a'], name: 'Oliveira' },
  { kind: 'gradient', id: 'night-sky', stops: ['#2a1a3a', '#1a2a3a'], name: 'Céu Noturno' },
  { kind: 'gradient', id: 'teal', stops: ['#1a3a3a', '#0f1f2e'], name: 'Azul-petróleo' },
]

export const PHOTOS: Extract<Background, { kind: 'photo' }>[] = []

export const BACKGROUNDS: Background[] = [...PHOTOS, ...GRADIENTS]
