# Architecture

Bun monorepo. Workspaces: `app`, `worker`, `packages/*`. PT-BR only. PWA + Capacitor.

## Stack

- **app/** — React 19 + Vite 8 + TanStack Router 1 SPA. Offline-first via Dexie.js (IndexedDB). ts-fsrs for SRS. PWA via vite-plugin-pwa. Capacitor v8 for native iOS/Android.
- **worker/** — Cloudflare Worker (Hono 4, Drizzle, D1 SQLite). Auth: JWT HS256 (30d). Sync: push/pull endpoints.
- **packages/shared/** — Zod schemas, bible constants, translation keys. Imported as `shared` workspace dep.

## Auth & sync

- Frontend auth: React Context + localStorage JWT. No dedicated auth routes — modal overlay.
- Cross-device sync: 30s interval + visibility/online events. Exponential backoff (max 120s).

## Bible data

6 PT-BR translations in `app/public/bible-{key}.json[.br]` (lazy-loaded, brotli preferred).

## Non-bible texts

Files live at `app/public/textos/{id}.json`: Apostles Creed, Nicene Creed, Heidelberg Catechism (128 Q&A, flat single-section), Westminster Shorter Catechism.

- Answers are clean prose — no inline footnote markers or scripture references.
- Seeding: `seedNonBibleText` in `db.ts` uses `NON_BIBLE_SEED_VERSIONS` (keyed by `sourceId`) + `localStorage['seed_v:{sourceId}']` to detect stale data and force re-seed. **Bump the version string whenever catechism/creed JSON content changes.**

## Browse navigation

When `source.sectionCount === 1`, a `useEffect` in `browse.tsx` and `collections.$slug.add.tsx` auto-sets `bookIndex=0, chapter=1`, skipping the section-list step. No back button is rendered for single-section sources. `sectionCount` in `AVAILABLE_SOURCES` must match the actual number of sections in the JSON.

## Capacitor

- `app/capacitor.config.ts` (appId: `com.verbumvitae.app`, webDir: `dist`). Native projects at `app/android/` and `app/ios/` (gitignored).
- Plugins: StatusBar (dark, #0f1117), SplashScreen, Keyboard (dark style, no resize), Share.
- URL schemes: iOS `vvitae://`, Android `https`.
- Build: set `VITE_API_URL` to full production URL in `app/.env` when building for native.
- PWA components (install button, update banner) auto-disable on native via `Capacitor.isNativePlatform()`.

## Deploy

Cloudflare Workers + Assets (no separate static host). CI/CD configured on Cloudflare dashboard (no in-repo config).

## `user-select` conventions

- `.verse-row` (browse list button): `user-select: none` — prevents accidental drag-selection on tap/swipe. **Exception:** `.verse-text` inside it overrides to `user-select: text` so the verse content is copyable.
- `.flashcard-hint` (review prompt): `user-select: none` — UI chrome, not content.
- Revealed flashcard text, catechism Q&A in collections: selectable by default (no override needed).
- UI buttons, labels, stats: naturally non-selectable as `<button>` elements.
