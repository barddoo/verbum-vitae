# Plan: Memorization efficacy & UX improvements

## Context

Audit of the review pipeline (`app/src/routes/review.tsx`, `app/src/routes/review/*`,
`app/src/lib/scheduler.ts`, `app/src/lib/srs.ts`, `app/src/lib/db.ts`) against what
actually drives long-term retention, plus a market scan of what Bible-memory users ask for.

Three findings are load-bearing and everything else is incremental on top:

1. **FSRS fuzz is off**, so a collection added in one tap stays clumped forever.
2. **Session limit slices before sorting**, so the most-overdue verses never surface.
3. **Review logs are never persisted**, which silently corrupts the streak calendar and
   makes FSRS parameter optimization permanently impossible.

Items are grouped in tiers by payoff. Tier 1 are near one-liners with outsized effect.

**Status:** Tier 1 (items 1, 2, 3) is shipped. The deliberate-practice loop — items 7, 5, 6, 8 —
is shipped. Item 4 (audio/TTS) is the next one up.

---

## Tier 1 — scheduler correctness

### 1. Enable FSRS fuzz — `app/src/lib/scheduler.ts:7` — ✅ DONE

`const scheduler = fsrs()` takes defaults, and `default_enable_fuzz = false`
(verified in `node_modules/.bun/ts-fsrs@5.4.1/node_modules/ts-fsrs/dist/index.mjs:505`).

`addCollectionToMemory` (`app/src/lib/db.ts:466`) creates N cards all due at the same
instant. Graded identically, they advance in lockstep — a 50-verse collection becomes a
recurring 50-verse wall with no way out. Fuzz jitters intervals and spreads the pile.

```ts
const scheduler = fsrs({ enable_fuzz: true })
```

Shipped with a regression test in `app/src/lib/scheduler.test.ts`: it matures a card past the
2.5-day fuzz floor and asserts the interval diverges from a plain `fsrs()` scheduler. Probed
across 20 sample cards before writing it — all 20 diverge, so it is not flaky.

Consider also exposing `request_retention` as a user setting later (default `0.9`), phrased
as "quer lembrar melhor? mais revisões" rather than a number. **Still open.**

### 2. Sort by due date before applying the session limit — `app/src/routes/review.tsx:190-193` — ✅ DONE

```ts
const selected = filteredProgress.slice(sessionOffsetRef.current, end)
const cards = getDueCards(selected)   // sorts, but only within the already-sliced window
```

`filteredProgress` preserves Dexie insertion (id) order. With `sessionLimit = 10` and 200
verses due, the session is always the same 10 *earliest-added* verses; the most overdue
never appear. Sort by `card.due` ascending **before** slicing.

Shipped as a `byDueDate` comparator applied at both return paths of the `filteredProgress`
memo (`review.tsx:116-158`), including the pinned-selection path. Sorts on the indexed
`dueDate` column rather than parsing `cardJson` — `dueDate` is written at every create and
grade site (`db.ts:485,554`, `browse.tsx:232,280`, `sync.ts:196`, `review.tsx:260`), so it
stays in step with the card and costs no JSON parse per row.

### 3. Persist review logs — new table, `app/src/lib/db.ts` + `worker/db/schema.ts` — ✅ DONE

`getNextCard` (`app/src/lib/scheduler.ts:11`) already returns `result.log`, and
`handleGrade` (`app/src/routes/review.tsx:255`) throws it away. There is no `reviewLog`
table in Dexie and none in D1.

Three consequences:

- **Streak calendar is wrong.** `stats.tsx:169` builds the heatmap from `lastReviewedAt(p)`,
  which is the *last* review per verse. Review a verse today, review it again tomorrow, and
  today's cell drops to zero — the heatmap rewrites its own history. "Hoje" (`stats.tsx:40`)
  has the same flaw.
- **FSRS optimization is impossible.** `computeParameters()` from
  `@open-spaced-repetition/binding` needs a review-log CSV. Without it, `w` can never be
  personalized to this user.
- No honest per-day review counts anywhere.

Add a Dexie `reviewLog` store plus the D1 mirror and a sync-log entry, and write the FSRS
`log` on every grade. This unblocks items 11 and 17 below and any future optimizer work.

**What shipped:**

- `ReviewLog` interface and a Dexie v7 store (`++id, reviewedAt, [verseId+translation]`) in
  `db.ts`, with `recordReview`, `reviewTimestamps` and `reviewLogRowId` helpers.
- `handleGrade` (`review.tsx`) appends a row per grade and queues a `reviewLog` sync entry.
  It stores `log.state` — the state *before* the grade, which is what an optimizer needs.
- `stats.tsx` (calendar, "hoje", streak) and `index.tsx` (streak) now read the log.
  `reviewTimestamps()` walks the `reviewedAt` index rather than loading whole rows, since the
  log grows without bound and both callers only need the days.
- `review_log` table in `worker/db/schema.ts` + migration `0007_review_log.sql`; the worker's
  `/sync/push` inserts reviews with `onConflictDoNothing`, and the server-side streak now
  derives from `review_log` instead of `DATE(progress.last_review)`.
- Both the Dexie v7 upgrade and the SQL migration backfill one row per already-reviewed verse
  from `progress.lastReview`, so existing users keep their streak. Backfilled rows carry
  `rating: 0` (day known, grade never recorded) — **filter those out before feeding an
  optimizer.**

**Deviation from the original sketch:** no `elapsedDays` column. ts-fsrs marks
`ReviewLog.elapsed_days` deprecated for removal in 6.0.0, and `convertCsvToFsrsItems` derives
elapsed time from consecutive review timestamps anyway, so storing it would have been a
liability rather than an asset.

---

## Tier 2 — memorization technique

### 4. Audio (TTS) — new, no dependency

The app cannot speak. Auditory rehearsal is the classic multiplier and audio playback ranks
top-3 in what users ask for; the app's own tip list recommends reading aloud twice
(`app/src/routes/review/session-complete.tsx:8,13`) while offering no way to do it.

`window.speechSynthesis` with a pt-BR voice is zero-dependency and satisfies the
"prefer native" convention. Two entry points:

- Speak the verse on flashcard flip / on reveal.
- A "modo escuta" that loops the day's queue hands-free.

### 5. Weight blanks by word heat — `app/src/routes/review/fill-in-blank-view.tsx:51-65` — ✅ DONE

`blankIndices` picks 35% of eligible words with a day+verseId-seeded PRNG. Meanwhile
`getWordHeat` is already fetched at line 68 and used only to *color* revealed words. The app
knows exactly which words the user fails and then blanks at random.

Bias selection toward low-accuracy indices (keep some randomness so it doesn't ossify).
Turns dice-rolling into deliberate practice.

Shipped as weighted sampling inside the `blankIndices` memo: `weight = (1 − accuracy) ×
(0.75 + 0.5 × seededRand())`, unknown heat defaults to 0.5. Same day+verseId seed, so the
set stays stable within a day; the memo now depends on the fetched `heat` map, recomputing
once after the local Dexie query resolves.

### 6. Record word accuracy in fill-blank mode — `fill-in-blank-view.tsx` + `db.ts:414` — ✅ DONE

Only typing mode calls `recordWordAccuracy`. In progressive mode a tap on a blank is an
explicit "I gave up on this word" — a perfect implicit signal, currently discarded. Record
tapped blanks as incorrect and blanks revealed without a tap as correct. Roughly doubles
the heat corpus feeding item 5.

Shipped with a `hasRecordedRef` guard: when `progressive && allRevealed`, tapped blanks
(`revealedIndices`) are recorded incorrect and the rest of the blanks correct — once per
verse. Non-progressive mode is unchanged (nothing recorded).

### 7. Wire up `levenshtein.ts` — it is dead code — ✅ DONE

`app/src/lib/levenshtein.ts` has zero production imports (only its own test). Typing mode
(`typing-practice-view.tsx:73`) compares words with exact normalized equality, so a single
typo marks the word wrong. Worse, `norm()`'s `[^a-zA-ZÀ-ÿ0-9]` class *keeps* accents, so
"coracao" ≠ "coração".

- Add a near-miss tier: distance ≤ 1 (≤ 2 for words over ~7 chars) renders amber and does
  not count as a failure.
- NFD-normalize and strip diacritics before comparing.

Fast typists currently get punished for finger slips, self-grade lower, and get a schedule
tuned to their keyboard rather than their memory.

Shipped with `normalizeForComparison` (lowercase → NFD → strip combining marks → strip
non-alphanumeric, so "coração" == "coracao") and `isNearMiss` (normalized Levenshtein ≤ 1,
≤ 2 above 7 chars). `typing-practice-view` now classifies each aligned word as exact /
near / miss: near-misses render `heat-near` amber in `HeatVerse` (optional `near` prop) and
amber in the diff list, count toward accuracy (`(correct + near) / m`), and are recorded as
*correct* in `recordWordAccuracy`. `levenshtein` itself is unchanged, so its raw-string
tests still hold.

### 8. Derive the suggested grade from typing accuracy — `typing-practice-view.tsx:168` — ✅ DONE

Typing mode measures recall objectively, then hands off to the generic `GradingButtons` and
asks the user to guess. The app's own tip #4 warns that dishonest self-rating breaks the
schedule. Pre-select a grade (100% → Fácil, ≥85% → Bom, ≥60% → Difícil, <60% → Esqueci)
with the user free to override.

Shipped as an optional `suggested` prop on `GradingButtons` — the matching button gets a
`grade-suggested` outline, nothing auto-submits. Other callers (flashcard, fill-blank) are
unaffected.

### 9. First-letter practice mode — new mode

The bridge technique between reading and unaided recall. `FlashcardView`'s `hintLevel === 1`
(`flashcard-view.tsx:41`) does it half-way, buried behind a hint button. Promote it to a
fourth `PracticeMode` reusing the fill-blank renderer with every word reduced to its first
letter.

### 10. Shuffle / interleave within a session — `review.tsx`

Order is fixed across sessions, so the user learns serial-position cues rather than the text.
Add a shuffle toggle alongside the existing limit and state filters.

### 11. Show real intervals on the grade buttons — `review/grading-buttons.tsx:9`

The hint is hardcoded: `"1 = vejo em breve · 4 = vejo em semanas"`. `scheduler.repeat()`
returns all four candidate cards, so the actual intervals ("10min / 2d / 5d / 12d") can be
rendered per verse. Removes the guesswork behind honest self-grading.

---

## Tier 3 — UX/UI

### 12. Daily reminder notifications

Streak is tracked and displayed (`index.tsx:95`, `stats.tsx:48`) but nothing brings the user
back. `@capacitor/local-notifications` is not installed. For a habit app this is the largest
remaining retention lever.

### 13. Haptics in the review loop

`@capacitor/haptics` is installed and used only in `hooks/use-swipe.ts` and
`hooks/use-long-press.ts`. No feedback on grade, on a perfect typing score, or on session
completion.

### 14. Keyboard shortcuts in review

Desktop review is mouse-only. Bind 1–4 to grades, Space to reveal/flip, Enter to advance.

### 15. Undo last grade

A misgrade writes a wrong schedule with no recovery path. Keep the previous `cardJson` for
the current session and offer one-step undo.

### 16. StrictMode double-invoke bug — `review.tsx:48-55`

```ts
useState(() => {
  const saved = localStorage.getItem('review_verse_selection')
  if (saved) { localStorage.removeItem('review_verse_selection'); return JSON.parse(saved) }
  return null
})
```

StrictMode is enabled (`app/src/main.tsx:47`) and React invokes the initializer twice in
development; the second call reads `null` because the first already removed the key, so the
pinned verse selection is lost. Move the read-and-clear into an effect.

### 17. Streak calendar is invisible on touch — `stats.tsx:247`

Cell detail lives in a `title` attribute, which never fires on touch. This is a mobile-first
app with a desktop-only affordance. Use a tap-to-show popover. (Pairs with item 3 — the data
behind it is wrong today regardless.)

### 18. Skip records nothing — `review.tsx:288`

`handleSkip` increments a counter and advances. Repeated skipping of the same verse is
invisible to both the user and the scheduler; it should at least be surfaced in stats.

### 19. Verse context at review time

Tip #1 tells the user to read the surrounding paragraph, but review shows the verse alone.
Chapter text is already local — add a "ver contexto" disclosure.

### 20. Component size rule is broken — repo-wide

`AGENTS.md` sets a 150-line max. Current: `review.tsx` 601, `browse.tsx` 577, `index.tsx` 398,
`db.ts` 758. Worst offender is `index.tsx`, which duplicates the entire install-guide and
presence blocks across both branches (lines 175-227 vs 290-342, ~80 lines copy-pasted).
Extract `<InstallGuideCard>` and `<CommunityPresenceCard>` first; split `review.tsx` into a
queue component and a session component.

---

## Suggested order

1. ~~Items 1, 2 — two small diffs, immediate scheduler correctness.~~ ✅ Done. Verified with
   `check:ts`, `check` and `test:unit` (198 passing). `check:layout` could not run on this
   machine — Playwright browsers are not installed (`npx playwright install`), unrelated to
   the change.
2. ~~Item 3 — data model change that unblocks stats and future optimization.~~ ✅ Done.
   `check:ts` and `check` clean, `test:unit` 202 passing. Migration `0007` applied against the
   local D1 and the replay no-op verified there (a second insert of the same review leaves one
   row). Remote still needs `bun run db:migrate:remote`, which `bun run deploy` does first.
3. ~~Item 7 — dead code already written, just needs wiring.~~ ✅ Done.
4. ~~Items 5, 6, 8 — deliberate practice loop, all building on existing `wordStats`.~~ ✅ Done.
   `check:ts` and `check` clean, `test:unit` 208 passing. `check:layout` still cannot run
   on this machine (Playwright browsers not installed). Note `bun run check` also applied
   Biome safe fixes to `collections.tsx` and `fonts.css` (unrelated, repo-wide).
5. Item 4 — largest new feature, highest user-facing demand. **Next.**
6. Tier 3 as capacity allows; item 20 alongside whichever file is being touched anyway.

## Decisions & Rationale

- **Fuzz over a rewrite of collection seeding.** Staggering due dates at insert time was the
  alternative, but fuzz is one line, is what FSRS is designed for, and keeps working for
  cards added any other way.
- **Persist logs rather than patch the calendar.** Deriving day counts from `lastReview` can
  be made less wrong but never right; the log is also the only path to `computeParameters`.
- **Web Speech API over a Capacitor TTS plugin.** Matches the "prefer native, prefer
  platform APIs" convention and adds no dependency; revisit only if pt-BR voice quality on
  Android proves inadequate.
- **Suggest, don't impose, the typing grade.** Auto-grading removes user agency and FSRS
  assumes a self-reported rating; pre-selection nudges honesty without overriding judgment.

## Sources

- [Bible Memory App — scripture memory techniques](https://biblememory.com/scripture-memory-techniques)
- [Best Bible memory apps 2026 (feature comparison)](https://www.biblememorygoal.com/memory-methods/best-bible-memory-apps/)
- [ts-fsrs — optimizer and parameter docs](https://github.com/open-spaced-repetition/ts-fsrs)
