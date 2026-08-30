import type { TextSourceMetadata } from 'shared/texts'

export interface SourceOption extends TextSourceMetadata {
  sectionCount: number
}

export const AVAILABLE_SOURCES: SourceOption[] = [
  {
    type: 'bible',
    id: 'bible',
    name: 'Bíblia',
    sectionLabel: 'Livro',
    itemLabel: 'Versículo',
    sectionCount: 66,
  },
  {
    type: 'creed',
    id: 'apostles',
    name: 'Credo Apostólico',
    sectionLabel: 'Seção',
    itemLabel: 'Art.',
    sectionCount: 3,
  },
  {
    type: 'creed',
    id: 'nicene',
    name: 'Credo Niceno',
    sectionLabel: 'Seção',
    itemLabel: 'Art.',
    sectionCount: 3,
  },
  {
    type: 'catechism',
    id: 'heidelberg',
    name: 'Catecismo de Heidelberg',
    sectionLabel: 'Parte',
    itemLabel: 'Perg.',
    sectionCount: 1,
  },
  {
    type: 'catechism',
    id: 'westminster',
    name: 'Breve Catecismo de Westminster',
    sectionLabel: 'Parte',
    itemLabel: 'Perg.',
    sectionCount: 1,
  },
]
