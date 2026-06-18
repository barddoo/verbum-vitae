# Plan: Help & Tips Section

## Context

The app already has a `help-modal.tsx` (5-step "Como usar") triggered by "?" in the top bar. It covers the basic flow but doesn't explain *how to memorize well*, how the review modes differ, or what grading really means for SRS scheduling. Users lack the mental model to use the app effectively, which leads to:
- Over-grading themselves → algorithm spaces too wide → they forget → habit breaks
- Not using context or vocalization → slower retention
- Adding too many verses at once → overwhelm → dropout

**Yes, add it.** The app's core value prop is memorization, but it doesn't teach users how to do that well.

---

## UX Approach (informed by research)

Two complementary touch points:

### 1. Expand `help-modal.tsx` — "Como usar" reference (on demand)
Better coverage of the *app mechanics* — review modes, grading, card states. Users who click "?" want to understand the tool. Keep the existing 5 steps, add a 6th covering review modes and grading meaning.

### 2. Rotating tip card on `session-complete.tsx` — memorization tips (contextual)
The session complete screen is the highest-engagement moment: users just practiced and are mentally tuned in. A single rotating tip here is:
- **More likely to be read** than a modal tab (contextual vs. on-demand)
- **Actionable immediately** — user can apply the tip in their next session
- **Non-intrusive** — one tip per session, not a list to scroll through

This two-pronged approach (reference + contextual) beats a pure modal tab, because tips shown in context stick better than tips in a help screen.

---

## Content (PT-BR, based on science-backed research)

### Help modal addition — review mode guide (6th step or separate section)

**Modos de revisão:**
- **Flashcard** — veja a referência e recite mentalmente; toque "Revelar" para conferir. Bom para revisão rápida de versículos já conhecidos.
- **Lacunas** — complete as palavras ocultas. Ative "Palavra por palavra" para revelar uma de cada vez — mais desafiador e eficaz.
- **Digitação** — escreva o versículo de memória. O app mede sua precisão palavra por palavra. Melhor para versículos novos.

**Sobre as notas:**
- **1 – Esqueci**: você vê de novo muito em breve
- **4 – Fácil**: pode não ver por semanas
- Avalie com honestidade — superestimar atrasa o aprendizado real.

### Rotating tips for session complete (cycle through array by session count)

Pool of 10 tips (show one at a time, rotate):

1. **Leia o contexto** — antes de memorizar, leia o parágrafo ao redor. O significado ancora as palavras.
2. **Leia em voz alta** — vocalizar aumenta a retenção em ~50% comparado à leitura silenciosa.
3. **Escreva à mão** — ao começar um versículo novo, escreva-o do zero uma vez.
4. **Avalie honestamente** — dizer "Fácil" quando não está fluente engana o algoritmo. O progresso real vem da avaliação precisa.
5. **Associe a uma situação** — pense em quando usaria esse versículo na sua vida. Memória emocional é mais durável.
6. **Consistência vence intensidade** — 5 versículos por dia supera 35 numa sessão semanal. Não pule dias.
7. **Recite em voz alta** — dizer o versículo para si (ou para alguém) adiciona um canal auditivo de memorização.
8. **Adicione devagar** — 1-2 versículos novos por vez. Muitos de uma vez causa acúmulo e abandono.
9. **Medite no significado** — entender o que o texto diz torna a memorização mais rápida e a retenção mais longa.
10. **Manhã é o melhor momento** — revisar cedo aproveita a consolidação da memória que ocorre durante o sono.

---

## Implementation

### Files to modify

| File | Change |
|------|--------|
| `app/src/components/help-modal.tsx` | Add 6th step covering review modes + grading explanation |
| `app/src/routes/review/session-complete.tsx` | Add rotating tip card (tip index = `reviewedCount % tips.length`) |
| CSS (wherever `.help-modal` styles live — grep to find) | Minor style for new step; tip card style on session complete |

### session-complete tip card structure

```tsx
// tip rotates based on session reviewed count (deterministic, no Date.now())
const TIP_INDEX_KEY = 'tip_index'
const nextIndex = (parseInt(localStorage.getItem(TIP_INDEX_KEY) ?? '0') + 1) % TIPS.length
localStorage.setItem(TIP_INDEX_KEY, String(nextIndex))
// render: <div className="session-tip">💡 {TIPS[nextIndex]}</div>
```

Visually: a light-bordered card below the session summary stats, before the action buttons. Small, unobtrusive — headline "💡 Dica" + one sentence.

### No new routes, no nav changes, no new modals

---

## Verification

1. `bun run check` — no TS or Biome errors
2. Open "?" → 6th step visible, review modes explained clearly
3. Complete a review session → tip card appears on session complete screen
4. Complete another session → different tip shown
5. Test on 390px width (iPhone) — tip card doesn't overflow, readable
