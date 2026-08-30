# Plano: Memorizar como bloco (versículos combinados)

## Contexto

O usuário quer adicionar passagens com múltiplos versículos (ex: os 10 Mandamentos, Êxodo 20:3-17) como **um único cartão SRS** em vez de 17 cartões separados. Atualmente, cada versículo vira um card independente.

O problema secundário: o botão "Adicionar à memória" na coleção fica desabilitado quando `col.memorized === col.total` (todos os versículos já estão memorizados individualmente), impedindo criar um card combinado.

### Boa notícia: a infra já existe

A base de dados e as funções de formatação já suportam IDs de range:

- `textKey('bible', '', bookNum, chapter, start, end)` → `b:2:20:3:17`
- `fetchVersesBatch()` já lida com range IDs: busca todos os versículos do intervalo e concatena o texto
- `verseIdToReference()` já formata range como "Êxodo 20:3-17"
- `parseTextKey()` já retorna `itemEnd`

O que falta é apenas a **UI para criar esses cards**.

---

## O que muda

### 1. `app/src/lib/db.ts` — nova função `addCollectionAsBlock`

```ts
export async function addCollectionAsBlock(
  collectionId: number,
  translation: string,
  logChange: (entry: ...) => void,
): Promise<number>
```

Lógica:
- Busca `collectionVerses` do collectionId, ordenado por `sortOrder`
- Agrupa por `bookNumber:chapter` (apenas versículos bíblicos; não-bíblicos ficam como individuais)
- Para cada grupo, calcula `minVerse` e `maxVerse`
- Cria verseId de bloco: `textKey('bible', '', book, chapter, minVerse, maxVerse)`
- Checa se já existe em `progress` — se sim, pula
- Faz `bulkAdd` dos blocos novos + `logChange` para sync

Padrão idêntico ao `addCollectionToMemory` já existente (`app/src/lib/db.ts:435`).

### 2. `app/src/routes/browse.tsx` — nova função `memorizeSelectedAsBlock`

```ts
async function memorizeSelectedAsBlock() {
  if (!isBible || bookIndex === null || chapter === null || selectedVerses.size < 2) return
  const sorted = [...selectedVerses].sort((a, b) => a - b)
  const minV = sorted[0], maxV = sorted[sorted.length - 1]
  const blockId = textKey('bible', '', bookIndex, chapter, minV, maxV)
  // check existing, bulkAdd, logProgressChange — mesmo padrão de memorizeSelected (linha 205)
}
```

- Só habilitado se `isBible && selectedVerses.size >= 2`
- Passa `onMemorizeAsBlock={memorizeSelectedAsBlock}` para `SelectionBar`

### 3. `app/src/routes/browse/selection-bar.tsx` — botão secundário "Como bloco"

Adiciona prop opcional `onMemorizeAsBlock?: () => void`. Quando presente, renderiza um segundo botão:

```tsx
{onMemorizeAsBlock && (
  <button type="button" className="btn btn-sm btn-secondary" onClick={onMemorizeAsBlock}>
    Como bloco
  </button>
)}
```

Layout da barra (da esquerda para direita): Limpar | Imagem? | **Como bloco?** | Memorizar

### 4. `app/src/routes/collections.tsx` — botão "Memorizar como bloco" na CollectionDetailPage

- Adiciona `addingBlock` / `addedBlock` states
- Botão novo abaixo (ou ao lado) do existente "Adicionar à memória"
- Habilitado independentemente de `memorized === total`
- Desabilitado só se `addingBlock`, `addedBlock`, ou `col.total < 2`
- Chama `addCollectionAsBlock(col.dbId, userTranslation, logProgressChange)`

```tsx
<button
  disabled={addingBlock || addedBlock || col.total < 2}
  onClick={handleAddAsBlock}
>
  {addedBlock ? '✓ Bloco adicionado' : addingBlock ? 'Adicionando…' : 'Memorizar como bloco'}
</button>
```

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `app/src/lib/db.ts` | + `addCollectionAsBlock()` (nova exportação) |
| `app/src/routes/browse.tsx` | + `memorizeSelectedAsBlock()`, passa prop para SelectionBar |
| `app/src/routes/browse/selection-bar.tsx` | + prop `onMemorizeAsBlock`, botão "Como bloco" |
| `app/src/routes/collections.tsx` | + estados e botão "Memorizar como bloco" na CollectionDetailPage |

---

## Comportamento no review

Sem alteração necessária. Quando o card de bloco entrar em revisão:
- `fetchVersesBatch()` já concatena todos os versículos do range
- `verseIdToReference()` já formata como "Êxodo 20:3-17"
- Os três modos de revisão (flashcard, lacunas, digitação) funcionam com o texto completo

---

## Constraints

- Blocos devem ser **contíguos e no mesmo capítulo** (limitação do verseId de range)
- Versículos de capítulos diferentes na mesma coleção geram **um bloco por capítulo**
- Versículos não-bíblicos (credos, catecismo) não suportam bloco (ficam como individuais no `addCollectionAsBlock`)
- Cards de bloco e individuais **coexistem** — criar um bloco não afeta cards individuais existentes

---

## Verificação

1. Browse → seleciona Êxodo 20:3-7 (long-press + tap) → toca "Como bloco" → confirm na tela que aparece badge de adicionado
2. Review → o novo card aparece com referência "Êxodo 20:3-7" e texto completo dos 5 versículos
3. CollectionDetail com `memorized === total` → botão "Adicionar à memória" desabilitado, "Memorizar como bloco" habilitado → toca → card de bloco criado
4. `bun run check` passa sem erros de tipo ou lint
