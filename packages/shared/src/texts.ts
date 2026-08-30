export const TEXT_SOURCE_TYPE_CHAR: Record<string, string> = {
  bible: 'b',
  creed: 'c',
  catechism: 'k',
}

export const CHAR_TO_TEXT_SOURCE_TYPE: Record<string, string> = {
  b: 'bible',
  c: 'creed',
  k: 'catechism',
}

export interface TextSourceMetadata {
  type: string
  id: string
  name: string
  sectionLabel: string
  itemLabel: string
}

export const TEXT_SOURCES: TextSourceMetadata[] = [
  { type: 'bible', id: 'bible', name: 'Bíblia', sectionLabel: 'Livro', itemLabel: 'Versículo' },
  { type: 'creed', id: 'apostles', name: 'Credo Apostólico', sectionLabel: 'Seção', itemLabel: 'Art.' },
  { type: 'creed', id: 'nicene', name: 'Credo Niceno', sectionLabel: 'Seção', itemLabel: 'Art.' },
  { type: 'catechism', id: 'heidelberg', name: 'Catecismo de Heidelberg', sectionLabel: 'Parte', itemLabel: 'Perg.' },
  { type: 'catechism', id: 'westminster', name: 'Breve Catecismo de Westminster', sectionLabel: 'Parte', itemLabel: 'Perg.' },
]

export const SOURCE_LABELS: Record<string, { name: string; itemLabel: string }> = {
  'creed:apostles': { name: 'Credo Apostólico', itemLabel: 'Art.' },
  'creed:nicene': { name: 'Credo Niceno', itemLabel: 'Art.' },
  'catechism:heidelberg': { name: 'Catecismo de Heidelberg', itemLabel: 'Perg.' },
  'catechism:westminster': { name: 'Breve Catecismo de Westminster', itemLabel: 'Perg.' },
}
