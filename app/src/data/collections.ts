interface VerseRef {
  sourceType?: string
  sourceId?: string
  book: number
  chapter: number
  verse: number | [number, number]
}

export interface BundledCollection {
  id: string
  name: string
  description: string
  icon: string
  verses: VerseRef[]
}

function v(book: number, chapter: number, verse: number | [number, number]): VerseRef {
  return { book, chapter, verse }
}

export const bundledCollections: BundledCollection[] = [
  {
    id: 'salvacao',
    name: 'Salvação',
    description: 'Versículos fundamentais sobre a salvação em Cristo',
    icon: '✦',
    verses: [
      v(42, 3, 16),
      v(44, 10, 9),
      v(48, 2, [8, 9]),
      v(44, 6, 23),
      v(44, 5, 8),
      v(61, 1, 9),
      v(43, 4, 12),
      v(44, 3, 23),
      v(42, 14, 6),
      v(46, 5, 17),
      v(44, 10, 13),
      v(55, 3, 5),
    ],
  },
  {
    id: 'romanos-8',
    name: 'Romanos 8',
    description: 'O capítulo completo — nenhuma condenação há para os que estão em Cristo Jesus',
    icon: '📜',
    verses: Array.from({ length: 39 }, (_, i) => v(44, 8, i + 1)),
  },
  {
    id: 'fruto-espirito',
    name: 'Fruto do Espírito',
    description: 'O caráter de Cristo formado em nós pelo Espírito',
    icon: '🍇',
    verses: [v(47, 5, 16), v(47, 5, [22, 23]), v(42, 15, [4, 5])],
  },
  {
    id: 'armadura-deus',
    name: 'Armadura de Deus',
    description: 'A proteção espiritual que Deus nos dá para resistir',
    icon: '🛡️',
    verses: [v(48, 6, [10, 18])],
  },
  {
    id: 'salmos',
    name: 'Salmos Selecionados',
    description: 'Salmos de conforto, confiança e louvor',
    icon: '🎵',
    verses: [
      v(18, 23, [1, 6]),
      v(18, 1, [1, 6]),
      v(18, 46, [1, 11]),
      v(18, 121, [1, 8]),
      v(18, 100, [1, 5]),
      v(18, 139, [1, 18]),
      v(18, 91, [1, 16]),
    ],
  },
  {
    id: 'promessas',
    name: 'Promessas de Deus',
    description: 'Grandes e preciosas promessas para nos sustentar',
    icon: '⭐',
    verses: [
      v(23, 29, 11),
      v(22, 41, 10),
      v(49, 4, 13),
      v(49, 4, 19),
      v(44, 8, 28),
      v(19, 3, [5, 6]),
      v(39, 28, 20),
      v(4, 31, 8),
      v(22, 43, 2),
      v(44, 15, 13),
      v(46, 1, 20),
    ],
  },
  {
    id: 'amor',
    name: 'Amor',
    description: 'O amor de Deus derramado em nossos corações',
    icon: '❤️',
    verses: [v(45, 13, [1, 13]), v(61, 4, [7, 21]), v(61, 3, 16), v(42, 15, 13), v(44, 5, 8)],
  },
  {
    id: 'fe',
    name: 'Fé',
    description: 'Andamos por fé, não por vista',
    icon: '🔥',
    verses: [v(57, 11, 1), v(46, 5, 7), v(44, 10, 17), v(57, 11, 6), v(47, 2, 20), v(39, 17, 20), v(40, 11, 24)],
  },
  {
    id: 'sermao-monte',
    name: 'Sermão do Monte',
    description: 'Ensinos de Jesus sobre o Reino de Deus',
    icon: '⛰️',
    verses: [
      v(39, 5, [3, 16]),
      v(39, 5, [43, 48]),
      v(39, 6, [5, 15]),
      v(39, 6, [19, 21]),
      v(39, 6, [25, 34]),
      v(39, 7, [7, 12]),
      v(39, 7, [24, 27]),
    ],
  },
  {
    id: 'esperanca',
    name: 'Esperança',
    description: 'Âncora da alma — a esperança viva que não envergonha',
    icon: '⚓',
    verses: [
      v(44, 15, 13),
      v(44, 5, [3, 5]),
      v(44, 8, [24, 25]),
      v(22, 40, 31),
      v(24, 3, [21, 23]),
      v(18, 130, [5, 6]),
      v(18, 62, 5),
      v(50, 1, 27),
      v(59, 1, 3),
      v(57, 6, 19),
    ],
  },
  {
    id: 'alegria',
    name: 'Alegria',
    description: 'O gozo do Senhor é a vossa força',
    icon: '🌟',
    verses: [
      v(49, 4, 4),
      v(15, 8, 10),
      v(18, 16, 11),
      v(18, 30, 5),
      v(42, 15, 11),
      v(58, 1, [2, 3]),
      v(51, 5, 16),
      v(35, 3, 17),
      v(22, 61, 10),
      v(18, 118, 24),
      v(18, 126, 3),
    ],
  },
  {
    id: 'redencao',
    name: 'Redenção',
    description: 'Remidos pelo precioso sangue de Cristo',
    icon: '🩸',
    verses: [
      v(48, 1, 7),
      v(50, 1, [13, 14]),
      v(47, 3, 13),
      v(47, 4, [4, 5]),
      v(59, 1, [18, 19]),
      v(44, 3, [23, 24]),
      v(22, 43, 1),
      v(18, 130, [7, 8]),
      v(55, 2, 14),
      v(22, 44, 22),
      v(65, 5, 9),
    ],
  },
  {
    id: 'reformada',
    name: 'Reformada',
    description: 'Soberania de Deus, eleição e graça irresistível',
    icon: '✠',
    verses: [
      v(48, 1, [3, 14]),
      v(42, 6, 37),
      v(42, 6, 44),
      v(42, 10, [27, 29]),
      v(44, 9, 16),
      v(42, 15, 16),
      v(54, 1, 9),
      v(44, 8, [28, 30]),
      v(18, 115, 3),
      v(49, 1, 6),
      v(22, 46, 10),
    ],
  },
  {
    id: 'oracao',
    name: 'Oração',
    description: 'Versículos sobre o poder e a prática da oração',
    icon: '🙏',
    verses: [
      v(39, 6, [5, 15]),
      v(49, 4, [6, 7]),
      v(51, 5, [16, 18]),
      v(39, 7, [7, 8]),
      v(42, 15, 7),
      v(61, 5, [14, 15]),
      v(39, 21, 22),
      v(18, 145, 18),
    ],
  },
]

export function verseRefToId(ref: VerseRef): string {
  const stChar = ref.sourceType === 'creed' ? 'c' : ref.sourceType === 'catechism' ? 'k' : 'b'
  const si = ref.sourceId || ''
  if (Array.isArray(ref.verse)) {
    if (si) return `${stChar}:${si}:${ref.book}:${ref.chapter}:${ref.verse[0]}:${ref.verse[1]}`
    return `${stChar}:${ref.book}:${ref.chapter}:${ref.verse[0]}:${ref.verse[1]}`
  }
  return si ? `${stChar}:${si}:${ref.book}:${ref.chapter}:${ref.verse}` : `${stChar}:${ref.book}:${ref.chapter}:${ref.verse}`
}
