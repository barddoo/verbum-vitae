# remember-bible roadmap

## Current state
- Bible browsing (3 PT-BR translations: ARA, ACF, NVI)
- FSRS spaced repetition flashcard review (4 ratings)
- 3 review modes (due, free, recent)
- Email/password auth + JWT
- Offline-first IndexedDB + Cloudflare D1 sync
- PWA with service worker
- Stats dashboard (streak, totals, stage breakdown)
- Dark theme, responsive layout

---

## Phase 1 — Better memory modes + UI polish

### 1.1 Fill-in-the-blank mode
- Show verse with random words blanked out
- User types the missing words
- Checks accuracy, shows correct answer
- Configurable difficulty: blank 1/3/5+ words

### 1.2 Typing practice mode
- Show reference only (like current front of card)
- User types full verse from memory
- Compare result vs actual using levenshtein/diff
- Show accuracy %, highlight wrong words
- Engages muscle memory + active recall

### 1.3 Unified review queue
- Merge 3 tabs (due/free/recent) into single queue
- Filters: by collection, by status (due/new/all), by book
- "Start review" button with count of due cards

### 1.4 Card flip animation + transitions
- Smooth 3D flip on card reveal
- Exit/entry transitions between cards

---

## Phase 2 — Predefined collections

### 2.1 Collection system
- Verses grouped into named sets
- Each verse can belong to 0+ collections
- Collections stored in IndexedDB, synced to D1

### 2.2 Bundled curated collections
- Key salvation verses
- Sermon on the Mount
- Psalms (selected)
- Romanos 8
- Promises of God
- Fruit of the Spirit
- Armor of God
- Navigators-style topical memory system

### 2.3 Collection browser UI
- Browse all available collections
- Preview verses in a collection
- One-tap "add to my verses" for entire collection
- Progress indicator per collection

---

## Phase 3 — Feedback & retention

### 3.1 Heat map per word
- Track which words user misses most during typing/fill-blank
- Visual overlay: red = high difficulty, green = mastered
- Focus practice on weak spots

### 3.2 Streak calendar
- GitHub-style contribution graph
- Visualize review consistency over weeks/months

### 3.3 TTS audio playback
- Text-to-speech for any verse
- Passive review mode: listen to verses on repeat
- Adjustable speed

### 3.4 Search & filter UI
- Search verses by text content
- Filter by collection, book, status (memorized/learning/new)

---

## Phase 4 — Stretch

- More translations (English: KJV, ESV, NIV, NASB)
- Push notifications for daily review (PWA)
- CSV import/export
- Audio recording & playback (record self)
- Achievements / badges
