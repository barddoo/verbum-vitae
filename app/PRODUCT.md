# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Individual Brazilian Christians (Portuguese speakers) memorizing scripture for personal devotion. The primary usage scene is a phone, often offline or on the go, in short daily review sessions.

## Product Purpose

Verbum Vitae helps Portuguese-speaking Christians memorize Bible verses through spaced repetition. It exists to make scripture retention a sustainable daily habit rather than an occasional reading. Success means consistent review and verses that stay memorized long-term. It is free to use and works offline-first.

## Positioning

PT-BR-native Bible memorization built on a research-grade scheduler. It bundles six PT-BR translations, curated collections, an offline-first architecture, and FSRS (via `ts-fsrs`) into one installable app. A neighboring product could not truthfully copy the combination of native Brazilian-Portuguese scripture coverage and a modern spaced-repetition algorithm.

## Operating Context

- Daily review sessions on a phone, each a small set of due verses.
- Three review modes: flashcard (mental recall), fill-in-the-blank (cloze), and typing from memory.
- Offline-first: memorization works without a network; cross-device sync is an optional enhancement.
- Live community presence shows how many people are memorizing now.
- Post-session verse-image sharing and a WhatsApp invite flow.
- Stats, streaks, and a ranking view.
- Email/password authentication for optional sync.

## Capabilities and Constraints

Confirmed shipped:

- Six PT-BR translations (NAA default), lazy-loaded from static JSON.
- FSRS spaced repetition via `ts-fsrs`.
- Three review modes plus curated collections.
- Offline-first storage via Dexie.js (IndexedDB) with a service worker.
- Optional cross-device sync on Cloudflare Workers + D1.
- Email/password auth with JWT.
- Installable PWA, plus Capacitor wrappers for iOS and Android.
- Live community presence over WebSocket.
- Verse-image sharing and WhatsApp invite.
- Stats, streak, and ranking surfaces.
- Optional donations.

Planned, not shipped (specified in `docs/FEATURES.md` — do not present as existing):

- Weekly community verse ("versículo comunitário semanal").
- "Amém" live reactions.
- Native Android app, then native iOS, as rewrites beyond the current Capacitor wrappers. Author intent, not near-term; do not describe as in progress or scheduled.

Constraints:

- PT-BR only. There is no localization layer and no English product surface.
- Free with optional donations; no paywall on scripture memorization.
- Bible text sourced from bolls.life.

## Brand Commitments

- Name: Verbum Vitae.
- Domain: vvitae.com. Native app id: `com.vvitae.app`. Author: Charles Fonseca.
- Voice: warm, encouraging Brazilian Portuguese. Uses typographic ellipsis (`…`) and curly quotes; no English fallback strings.
- The name and its Latin meaning are a binding identity anchor, not a placeholder.

## Evidence on Hand

- Bible data: `app/public/bible-{key}.json[.br]` for the six PT-BR translations.
- Non-bible texts: `app/public/textos/` — Apostles' Creed, Nicene Creed, Heidelberg Catechism, Westminster Shorter Catechism.
- Incumbent design system: `app/src/styles/` (fonts, layout, pages, shared, responsive, reset).
- Documentation: `README.md`, `docs/architecture.md`, `docs/FEATURES.md`, `AUTH.md`.

Absences future work must not fabricate: no testimonials, user counts, press coverage, case studies, benchmarks, or partner logos are on hand.

## Product Principles

1. **Practice over consumption.** The product is measured by verses retained, not content browsed.
2. **PT-BR first.** Every string, translation, and typographic detail is Brazilian Portuguese; there is no English fallback.
3. **Offline by default.** Core memorization must work without a network; sync and social features are enhancements, never prerequisites.
4. **Small daily wins.** Consistency is rewarded over intensity — streaks and live presence make the daily habit feel shared.
5. **Free access to scripture.** Memorization is never paywalled; support is voluntary.

## Accessibility & Inclusion

- Mobile-first; desktop is an enhancement.
- Repository UI conventions require `aria-label` on icon buttons, `aria-hidden` on decorative icons, a visible `focus-visible` replacement wherever focus outlines are removed, and honoring `prefers-reduced-motion`.
- Verse content is selectable and copyable, while UI chrome (verse rows, flashcard hints) suppresses accidental selection.
