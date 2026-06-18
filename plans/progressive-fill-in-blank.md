# Progressive Fill-in-Blank (Obfuscate-style)

Enhance the existing Fill-in-Blank review mode with an optional progressive
"tap-to-reveal" sub-mode, inspired by Remember Me's Obfuscate method.

## Files to change (3)

### 1. `app/src/routes/review.tsx` — Queue UI + state

- Add `progressiveBlanks` boolean state, initialized from:
  `localStorage.getItem('review_fill_blank_progressive') === '1'`
- Below the "Completar" mode card (or inline next to it), render a small toggle:
  `"Palavra por palavra"`
  - Only visible when `practiceMode === 'fill-blank'`
  - Persist on change to localStorage
- Pass `progressive={progressiveBlanks}` to `<FillInBlankView>`

### 2. `app/src/routes/review/fill-in-blank-view.tsx` — Core logic

- Accept new `progressive: boolean` prop (default `false`)
- Replace single `revealed` boolean with:
  - `revealedIndices: Set<number>` — tracks individually revealed blanks
  - `revealedAll: boolean` — tracks "Revelar todos" action
  - Derived: a word at index `i` is visible when `revealedAll || revealedIndices.has(i)`
- Each blank `<span>` becomes a `<button type="button">`:
  - `onClick={() => setRevealedIndices(prev => new Set([...prev, i]))}`
  - `className="blank-word blank-interactive"`
  - `aria-label="Revelar palavra"`
- Actions bar:
  - **Progressive mode:** "Revelar todos" button (sets `revealedAll = true`, grading appears)
  - **Non-progressive mode:** unchanged "Revelar"/"Ocultar" toggle
- Grading buttons appear when all blanks are revealed

### 3. `app/src/styles/pages/review.css` — Styling

```css
.blank-interactive {
  cursor: pointer;
}
.blank-interactive:hover,
.blank-interactive:focus-visible {
  border-color: var(--gold);
  color: var(--parchment);
  background: rgba(212, 168, 83, 0.08);
}
.blank-word:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
  border-radius: 2px;
}
.blank-revealed {
  border-bottom-color: transparent;
  color: var(--sage);
}
```

## Edge cases

- **No blanks eligible** (<3 chars): same as today — show full verse, grading appears
- **Progressive → reveal all**: "Revelar todos" fills remaining, grading appears
- **Keyboard**: Enter/Space on focused blank reveals it (built-in button behavior)
- **Next verse**: `key` prop reset in parent handles state reset

## Storage

| Key | Values | Default |
|-----|--------|---------|
| `review_fill_blank_progressive` | `'1'` / `'0'` | `'0'` (off) |

Separate from `review_mode` — a sub-option, not a 4th mode.

## UX flow

```
Queue phase (review.tsx)
  ┌─────────────────────┐
  │  Completar           │  ← mode card
  │  ☐ Palavra por palavra│  ← new toggle (only when fill-blank selected)
  └─────────────────────┘

Session phase (fill-in-blank-view.tsx)
  BEFORE (non-progressive):       AFTER (progressive):
  "No princípio, criou ____      "No princípio, criou ____
   os ____ e a terra."             os ____ e a terra."
  [Revelar]           ← one btn   [Revelar todos]  ← reveals all
                                  (tap blank word to reveal individually)
```

---

# Multiple Choice Mode (separate feature)

New 4th review mode: `'multiple-choice'`. Sits between Flashcard and Fill-in-blank on the
difficulty ladder — lower friction than typing or fill-blank, good for new/difficult verses.

```
Flashcard → Multiple choice → Fill-in-blank (progressive) → Fill-in-blank → Typing
(easiest)                                                                  (hardest)
```

## Files to change (3)

### 1. `app/src/routes/review.tsx` — Mode type + card

- Add `'multiple-choice'` to `PracticeMode` union
- Add mode card: title `"Múltipla Escolha"`, desc `"Escolha a palavra certa"`
- Import and render `<MultipleChoiceView>` in session phase
- No sub-toggle needed

### 2. `app/src/routes/review/multiple-choice-view.tsx` — New file

**Target word selection**
- Reuse same `blankIndices` seed logic from fill-in-blank (deterministic per verseId+day)
- Pick a single target: first index in sorted `blankIndices` set
- If no eligible blanks: show full verse + grading buttons immediately (same fallback as fill-blank)

**Distractor generation**
- Pool: all words in the verse with `replace(STRIP_NON_ALPHA, '').length >= 3`, excluding the correct word
- Pick 3 distractors: prefer words of similar length (±2 chars) — feels harder / more honest
- If verse doesn't have enough words: repeat pool without length filter
- Shuffle all 4 options deterministically (same seed pattern)

**State**
```ts
const [selected, setSelected] = useState<number | null>(null)
// selected = index into `options[]`, null = not yet answered
```
- `options: string[]` — derived (not state), computed from seed in `useMemo`
- `correctIndex: number` — index of correct answer in `options`

**Render**
- Show verse with target word blanked (same `_`.repeat display as fill-blank)
- 4 `<button>` option pills below verse
- On select:
  - Correct: option turns green (`.mc-option-correct`), grading buttons appear
  - Wrong: selected turns red (`.mc-option-wrong`), correct turns green, grading buttons appear
  - Once selected, all options disabled (`disabled` attr + pointer-events: none)
- No "Revelar" button — answer selection is the reveal

**Grading**
- No auto-grade — user grades manually after seeing result (keeps same grading semantics as other modes)
- Grading buttons appear immediately after any selection

### 3. `app/src/styles/pages/review.css` — Styling

```css
.mc-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem;
  margin-bottom: 1.25rem;
}

.mc-option {
  background: var(--leather);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--parchment);
  font-family: var(--font-display);
  font-size: 0.95rem;
  padding: 0.75rem 0.5rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.mc-option:hover:not(:disabled) {
  border-color: var(--gold);
  background: rgba(212, 168, 83, 0.06);
}

.mc-option-correct {
  border-color: var(--sage);
  color: var(--sage);
  background: rgba(var(--sage-rgb), 0.08);
}

.mc-option-wrong {
  border-color: #c0392b;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.08);
}

.mc-option:disabled {
  cursor: default;
  opacity: 0.6;
}

.mc-option-correct:disabled,
.mc-option-wrong:disabled {
  opacity: 1;
}
```

## Edge cases

- **No eligible blanks**: show full verse, grading appears immediately (no options rendered)
- **Verse with <4 distinct words**: pad distractors by re-using pool without length filter; last resort duplicate short words (unlikely in Bible text)
- **Next verse**: same key-prop reset as other modes

## Storage

No new localStorage keys — mode persists via existing `review_mode` key.

## UX flow

```
Session phase:
  "No princípio, _____ Deus os céus e a terra."

  [ criou  ]  [ disse  ]
  [ fez    ]  [ viu    ]

  → tap "criou" (correct):
  [ criou ✓ ]  [ disse  ]     ← green border
  [ fez    ]   [ viu    ]
  [Fácil] [Bom] [Difícil] [Errei]

  → tap "disse" (wrong):
  [ criou ✓ ]  [ disse ✗ ]    ← correct green, wrong red
  [ fez    ]   [ viu    ]
  [Fácil] [Bom] [Difícil] [Errei]
```
