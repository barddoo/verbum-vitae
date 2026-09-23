---
name: Verbum Vitae
description: A candlelit scriptorium for memorizing scripture — leather, parchment, gold leaf, and ink.
colors:
  ink: "#1c1b1a"
  leather: "#252321"
  leather-hover: "#2e2b28"
  leather-deep: "#282420"
  parchment: "#f0ece8"
  aged: "#948d88"
  border: "#332f2b"
  verdigris-ink: "#1a9b8c"
  verdigris-hover: "#148275"
  gold-leaf: "#c9a84c"
  gold-leaf-hover: "#b8942e"
  rubric-ink: "#c0526a"
  sage: "#4a9e7a"
  presence-green: "#4ade80"
  accent-azure: "#4a7bb5"
  accent-violet: "#7b6cb0"
  accent-amber: "#d48836"
  accent-aqua: "#3a9e8f"
  accent-slate: "#6b7280"
typography:
  display:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: "clamp(1.65rem, 6.5vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Nunito Variable, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
  label:
    fontFamily: "Nunito Variable, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.1em"
  mono:
    fontFamily: "JetBrains Mono, SF Mono, ui-monospace, monospace"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.02em"
rounded:
  sm: "0.25rem"
  md: "0.625rem"
  pill: "1rem"
  lg: "1.25rem"
  xl: "2rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.verdigris-ink}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "11px 22px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.verdigris-hover}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "11px 22px"
    height: "44px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.aged}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "11px 22px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "rgba(26, 155, 140, 0.1)"
    textColor: "{colors.verdigris-ink}"
    rounded: "{rounded.full}"
    padding: "11px 22px"
    height: "44px"
  button-large:
    backgroundColor: "{colors.verdigris-ink}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "16px 32px"
    width: "100%"
  button-small:
    backgroundColor: "{colors.verdigris-ink}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "5px 14px"
  input:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.parchment}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.aged}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "5px 14px"
  chip-active:
    backgroundColor: "{colors.verdigris-ink}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "5px 14px"
  card:
    backgroundColor: "{colors.leather}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.lg}"
    padding: "16px"
  modal:
    backgroundColor: "{colors.leather}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.lg}"
    padding: "32px 28px"
    width: "448px"
  nav-item-active:
    backgroundColor: "rgba(26, 155, 140, 0.1)"
    textColor: "{colors.verdigris-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "11px 24px"
---

# Design System: Verbum Vitae

## Overview

**Creative North Star: "The Illuminated Scriptorium"**

Verbum Vitae is a candlelit scribe's study rendered as a phone app. Its material vocabulary is the manuscript workshop: dark leather bindings (`#252321`), parchment text (`#f0ece8`), gold leaf for reward, rubric-red ink for correction, and a single working ink of verdigris teal (`#1a9b8c`) for everything interactive. The metaphor is carried entirely in color, type, and proportion — never in texture images — so the interface reads as a bound devotional book rather than a themed skin.

The mood is warm, reverent, and quietly confident. It is a daily companion, not a monument: surfaces are calm and low-contrast, chrome recedes, and the scripture is the brightest thing on screen. Fraunces, a variable serif with real calligraphic warmth, carries verse text, references, and every meaningful numeral; Nunito, a rounded humanist sans, handles the working UI so labels stay legible at 11px on a phone. Generous 44px touch targets and a 20px corner radius keep the book soft in the hand.

Density is low and pace is unhurried. The layout is a single narrow column (max 32.5rem) that grows into a sidebar layout on desktop without ever becoming a dashboard. Ornament is rationed to one thing: a lone `✦` divider under collection headers, plus the teal drop-cap on a revealed verse. This restraint is deliberate — it is what keeps the system devotional instead of decorative.

**Key Characteristics:**
- Leather-and-parchment tonal layering with 1px borders; flat at rest, glowing only on action.
- One interactive accent (verdigris teal); gold, rubric, and sage are semantic states, never decoration.
- Fraunces for the sacred text, Nunito for the working interface, tabular mono for numerals.
- Pill buttons at 44px minimum, soft 20px radii on every container.
- Dark-first, with a fully specified warm light mode that swaps ink and parchment.
- Confirmed anti-references: glassmorphism and neon SaaS gradients, literal skeuomorphic texture, heavy gothic ornament, and generic mobile-app chrome.

## Colors

A bookbinder's palette: warm darks, aged paper, and four inks with strict semantic jobs.

### Primary
- **Verdigris Ink** (`#1a9b8c`): the single interactive accent. Active nav items, primary buttons, progress fills, focus rings, selected states, links, and every numeric highlight. Hover deepens to `#148275`. Tints are expressed as `rgba(26, 155, 140, 0.1)` (`--teal-dim`) and `rgba(26, 155, 140, 0.15)` (`--teal-glow`) — a wash for selected surfaces, a halo for hover glow.

### Secondary
- **Gold Leaf** (`#c9a84c`): reward and streak. The streak counter, the "session complete" headline, `--grade-2`, ranking medals, and the `--me` ranking row. Hover/active deepen to `#b8942e`. Never used for interaction.
- **Rubric Ink** (`#c0526a`): correction and danger. Destructive buttons, error banners, `--grade-1`, typed-wrong diffs, and the leaked-credentials warning. A 12%-alpha wash (`--rubric-dim`) carries its surfaces.

### Tertiary
- **Sage** (`#4a9e7a`): confirmation and mastery. Memorized badges, `--grade-3`/`--grade-4`, correct diffs, success hints, and the "added" button state. Its 8%-alpha wash (`--sage-dim`) is the quietest surface tint in the system.

### Neutral
- **Ink** (`#1c1b1a`): the page background and every input well. The darkest plane.
- **Leather** (`#252321`): the default surface — cards, modals, nav bars, inputs at rest. Hover lifts to `#2e2b28`; the deep gradient stop is `#282420`.
- **Parchment** (`#f0ece8`): primary text and the foreground plane.
- **Aged Brass** (`#948d88`): all secondary text, labels, hints, placeholders, and inactive icons. Kept at ≥4.5:1 against Leather so secondary copy stays legible on cards.
- **Border** (`#332f2b`): the single 1px rule that defines nearly every edge, divider, and inactive control.

### Accents (user-authored collections)
Eight pickable accents give user collections identity via a 2px top rule (`--col-accent`): Ouro `#c9a84c`, Sálvia `#4a9e7a`, Rubi `#c0526a`, Azul `#4a7bb5`, Violeta `#7b6cb0`, Âmbar `#d48836`, Verde-água `#3a9e8f`, Cinza `#6b7280`. Plus **Presence Green** `#4ade80`, reserved for the live-community online dot.

### Light Mode
`[data-theme="light"]` redefines the same token names for a warm daylight page: Ink `#f9f4f2`, Leather `#f0ebe7` (hover `#e8e2dc`, deep `#ece7e3`), Parchment `#2d2c2b`, Aged `#6b6664`, Border `#e2ded9`, Verdigris `#0c7265` (hover `#0a6259`), Gold `#95591a` (hover `#7e4a15`), Rubric `#a83a52`, Sage `#2f6f54`. The page wash (two radial gradients, teal at top and gold at bottom-right) is present in both modes but fainter in light. Semantic inks darken in light mode so state text (gold, rubric, sage) clears 4.5:1 on the lighter Leather.

### Named Rules
**The One Accent Rule.** Verdigris is the only interactive color. Gold, rubric, and sage communicate state and must never be used to make something look tappable. If a control is interactive, it is teal; if it is gold, it is a reward; if it is rubric, it is a warning.

**The Inked Wash Rule.** Tinted surfaces use alpha washes of their own color (`--teal-dim`, `--gold-dim`, `--rubric-dim`, `--sage-dim`), never a lighter solid. Tint means "this state is active", and it should always read as the same plane with ink laid over it.

## Typography

**Display Font:** Fraunces Variable (with Georgia, serif)
**Body Font:** Nunito Variable (with system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (with SF Mono, ui-monospace) — declared but not self-hosted, so it resolves to the platform mono in practice.

**Character:** A warm calligraphic serif meets a rounded humanist sans. Fraunces gives verse and numerals a hand-set, slightly old-book voice; Nunito keeps labels, buttons, and hints friendly and legible at phone sizes. The pairing is reverent without being austere, and it never tips into blackletter pastiche.

### Hierarchy
- **Display** (600, `clamp(1.65rem, 6.5vw, 2.25rem)`, 1.15, `-0.02em`): hero greetings, collection names, settings and dicas titles. Scales up to `clamp(5rem, 20vw, 6.5rem)` for the single review-queue counter and `2.25rem` for the session-complete headline.
- **Verse** (600, `clamp(1.25rem, 4.5vw, 1.6rem)`, 1.75): the scripture itself, in Fraunces, with a teal drop cap via `initial-letter: 2` (floated fallback at `2.4rem`).
- **Title** (600–700, `0.85–1.1rem`, 1.25–1.4): card names, modal titles, section heads in Fraunces.
- **Body** (400–600, `0.75–0.95rem`, 1.5–1.7): Nunito for all running UI text, hints, and descriptions. Verse context uses Fraunces body at `0.95rem`/1.8.
- **Label** (500–700, `0.55–0.75rem`, `0.06–0.156em`, uppercase): Nunito uppercase micro-labels for stats, section eyebrows, form labels, and nav items. At the smallest end, letter-spacing widens to keep them readable.
- **Mono** (600, `0.6–0.75rem`, tabular): counts, dates, intervals, streak calendar month/day labels, ranking numbers, and the typing diff. Always `font-variant-numeric: tabular-nums` where numbers align in columns.

### Named Rules
**The Sacred Serif Rule.** Fraunces is reserved for what the user is meant to dwell on — verse text, references, names, and reward numerals. Nunito never sets scripture, and Fraunces never sets a button.

**The Small Caps Rule.** Any label under 12px is uppercase with at least `0.06em` tracking. Lowercase micro-type is not permitted.

## Layout

A single centered column, mobile-first and built for one hand. The app shell is `max-width: 32.5rem` (520px), with pages padded `1.25rem` and content stacked in a simple vertical flow — no multi-column dashboards at any breakpoint. The bottom navigation is fixed and full-width up to the shell width; the top bar is sticky with a 0.375rem backdrop blur and an ink→transparent gradient so content scrolls under it.

Three breakpoints reshape the same column:
- **20rem / 22.5rem (360px)**: micro-adjustments for small phones — tighter nav gaps, smaller nav labels, larger flip-card minimum height.
- **48rem (768px)**: page padding grows to `1.5rem 1.875rem`; grids expand (book list to 3 columns, chapter grid to 10, collections to 3); hero padding grows to `3.5rem 3rem`; review-mode and session panels cap their width and center.
- **56.25rem (900px)**: the shell widens to `62rem`; the fixed bottom nav is replaced by a `12.5rem` sticky sidebar; the sticky top bar becomes static.

The spacing rhythm is a 4px-rooted scale — `0.25 / 0.375 / 0.5 / 0.625 / 0.75 / 0.875 / 1 / 1.25 / 1.5 / 1.75 / 2rem` — used almost exclusively as `gap` and `margin-bottom` between stacked blocks. Density is deliberately low: cards breathe at `0.875–1.25rem` internal padding, and page sections separate by `1–1.5rem`. Fixed elements (bottom nav, selection bar, collection actions) offset themselves with `calc(3.5rem + env(safe-area-inset-bottom))`, and every full-bleed surface respects `env(safe-area-inset-*)`.

## Elevation & Depth

The system is **flat by default**. `--card-shadow` is literally `none`, and cards never float. Depth is conveyed by tonal layering (a `--leather` panel over the `--ink` page), a single 1px `--border` rule on almost every surface, and — on hero and flip-card faces — a subtle `linear-gradient(175deg, leather, leather-gradient-end, leather)` sheen that reads as curved leather rather than a shadow. Shadows appear only in three cases: overlays that genuinely float above the page, accent glows that respond to interaction, and the verse-image canvas.

### Shadow Vocabulary
- **Modal lift** (`0 0.5rem 2.5rem rgba(0, 0, 0, 0.4)`): modals and modal cards only.
- **Popover lift** (`0 0.375rem 0.75rem rgba(0, 0, 0, 0.4)`): the streak-calendar day popover.
- **Image lift** (`0 0.25rem 1.25rem rgba(0, 0, 0, 0.5)`): the rendered verse-image preview.
- **Accent glow** (`0 0 1.25rem var(--teal-dim)`, hover `0 0 1.75rem var(--teal-glow)`): the primary button at rest and on hover. This is a halo, not a drop shadow.
- **Dot glow** (`0 0 0.25rem rgba(74, 222, 128, 0.5)`): the online presence dot.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. If something appears to float, it is either an overlay above the page or an accent responding to hover — there is no third reason to add a shadow.

**The Border-Not-Shadow Rule.** To separate two surfaces, add a 1px `--border` and change the fill, never a shadow. Borders define the book's structure; shadows are reserved for things that leave the page.

## Shapes

The form language is soft, rounded, and book-like. The default radius is `--radius: 1.25rem` (20px), applied to cards, modals, inputs, and the larger controls. Above that sit two families: fully rounded **pills** (`9999px`) for buttons, tabs, chips, the active-nav backdrop, and badges; and **circles** for medallions, presence dots, color swatches, mode dots, and the help button. Below the default, small radii (`0.25rem`, `0.625rem`, `1rem`, `2rem`) appear on dense or nested elements — state badges, collection cards, filter chips, and the memorized badge.

Borders are always hairline (1px) and always `--border`, with three recurring exceptions: a `0.125rem` left accent on nav items and verse rows, a 2px top rule on collection cards (`--col-accent`), and a dotted `0.125rem` underline on blank-word placeholders. Corners are never square and never sharp; there are no diagonal cuts, notches, or clipped panels. The only literal ornament in the whole system is the `✦` divider that closes a collection header.

## Components

### Buttons
- **Shape:** fully rounded pill (`9999px`), minimum height `2.75rem` (44px), `touch-action: manipulation`.
- **Primary:** verdigris fill (`--teal`), white text at weight 700, an ambient `0 0 1.25rem var(--teal-dim)` glow. Hover deepens the fill to `--teal-hover` and widens the glow to `0 0 1.75rem var(--teal-glow)`.
- **Secondary:** transparent with a 1px `--border`, aged-brass text. Hover shifts text and border to verdigris and lays down a `--teal-dim` wash.
- **Large:** `1rem 2rem` padding, `1rem` text, `width: 100%` — the single primary action on onboarding and session-complete screens.
- **Small:** `5px 14px`, `0.75rem` text, and a tighter `--radius` corner; used inside dense rows and modals.
- **Danger:** rubric text with a `rgba(192, 82, 106, 0.3)` border, filling to `--rubric-dim` on hover. A filled `--rubric` variant is reserved for destructive confirm.
- **Grade buttons:** a 4-up grid, each transparent with a 1px border, colored by meaning — rubric (again), gold (hard), sage (good/easy) — and filled solid on hover/active. The FSRS-suggested grade adds a 2px `--teal` outline.
- **Icon button:** bordered small rect at `--radius`, aged-brass, teal on hover.

### Chips
- **Style:** `1rem` radius, 1px `--border`, transparent or `--leather` fill, aged-brass text at `0.75rem`.
- **State:** active chips fill solid verdigris with white text; source chips add a circular count badge that inverts on the active state. Filter chips scroll horizontally with a hidden scrollbar.

### Cards / Containers
- **Corner Style:** `--radius` (1.25rem) for standard cards; `0.625rem` for the denser collection grid.
- **Background:** `--leather` over the `--ink` page, or the 175° leather gradient on hero and flip-card faces.
- **Shadow Strategy:** none — see Elevation & Depth.
- **Border:** 1px `--border`; collection cards add a 2px `--col-accent` top rule.
- **Internal Padding:** `0.875rem–1.25rem`, scaling up on tablet.

### Inputs / Fields
- **Style:** inset `--ink` well with a 1px `--border` and `--radius` corners; parchment text; italic aged-brass placeholder.
- **Focus:** border shifts to verdigris, plus a `0 0 0 3px var(--teal-dim)` halo on form inputs or a `2px solid var(--teal)` outline on the typing area.
- **Disabled:** 40–50% opacity with a not-allowed cursor. Checkboxes and radios use `accent-color: var(--teal)`.

### Navigation
- **Top bar:** a 3-column grid (logo / wordmark / actions), sticky, with a 0.375rem backdrop blur over an ink→transparent gradient and a 1px bottom border. The wordmark is Fraunces at `1.15rem`.
- **Bottom nav (mobile):** fixed, `--leather` fill, 1px top border, items stacked icon-over-label in uppercase `0.6rem` at `0.05rem` tracking. The active item turns verdigris and gets a `3.25rem × 2rem` pill-shaped `--teal-dim` backdrop behind its icon.
- **Sidebar (≥900px):** `12.5rem`, `--leather`, 1px right border, items with a `0.125rem` left accent that turns verdigris when active, plus a `--teal-dim` wash.

### Modal
- **Backdrop:** `rgba(0, 0, 0, 0.6)` with a 2px blur, `overscroll-behavior: contain`, fading in over 0.2s.
- **Panel:** `--leather`, 1px `--border`, `--radius` corners, `1.75–2rem` padding, `max-width: 28rem`, lifted by `0 0.5rem 2.5rem rgba(0, 0, 0, 0.4)` and rising over 0.25s. Tabbed modals use a 1px bottom rule with a `0.125rem` verdigris underline on the active tab.

### Signature Components
- **Flip Card (flashcard):** a `62.5rem` perspective container whose inner grid rotates 180° over 0.25s; front and back are stacked leather-gradient faces. Verse text carries a teal drop cap; the front reveals via backface-visibility rather than swapping content.
- **Streak Calendar:** a GitHub-style contribution grid using four verdigris alpha levels (`0.25 / 0.5 / 0.75 / 1`), with mono month/day labels and a lifted popover on tap.
- **Verse Image Composer:** a live canvas preview framed in an ink well, with segmented controls, custom range sliders (verdigris thumb on a border track), and a scroll-snapped carousel of photo and gradient backgrounds — sticky header and action bar inside a scrolling modal.
- **Selection Bar:** a fixed leather action bar that slides up on selection, showing a Fraunces count, an italic preview, and compact secondary/primary actions.

## Do's and Don'ts

### Do:
- **Do** use verdigris (`--teal`) for every interactive or active state, and nothing else.
- **Do** separate surfaces with a 1px `--border` and a tonal fill change (`--leather` over `--ink`), not a shadow.
- **Do** set scripture, references, names, and reward numerals in Fraunces; set UI labels and body in Nunito.
- **Do** use `--radius` (1.25rem) for cards, inputs, and modals, and `9999px` for buttons, tabs, and chips.
- **Do** keep every tap target at least `2.75rem` (44px) and add `touch-action: manipulation`.
- **Do** guard every animation with `@media (prefers-reduced-motion: reduce)`.
- **Do** give focus a visible `2px solid var(--teal)` outline (offset 1–2px) wherever the default outline is removed.
- **Do** write every string in warm Brazilian Portuguese with typographic ellipses (`…`) and curly quotes.

### Don't:
- **Don't** add shadows to cards — `--card-shadow` is `none` by design.
- **Don't** use gold, rubric, or sage to make something look tappable; they are states, not actions.
- **Don't** introduce glassmorphism, frosted panels, or neon and purple-blue SaaS gradients.
- **Don't** render literal leather grain, paper texture, faux stitching, or object-mimicking shadows — the material metaphor lives in color and naming only.
- **Don't** use blackletter type, dense filigree, or drop caps anywhere except the revealed verse first-letter and the single `✦` divider.
- **Don't** import Material floating action buttons, stock card shadows, or a corporate-blue accent.
- **Don't** add an English fallback string or a localization layer; the product is PT-BR only.
