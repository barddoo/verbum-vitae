# Verbum Vitae — AGENTS.md

Bun monorepo. Workspaces: `app`, `worker`, `packages/*`. **PT-BR only. PWA + Capacitor.**

## Commands (run from root)

| What | How |
|------|-----|
| Dev app | `bun run dev` (Vite :5173) |
| Dev worker | `cd worker && bunx wrangler dev` (:8787) |
| Full check | `bun run check` → runs `check:ts` then `check:biome` |
| Typecheck | `bun run check:ts` (runs in order: shared → worker → app) |
| Lint/fix | `bun run fix` (Biome --write --unsafe) 
| Build+deploy | `bun run deploy` (builds app, wrangler deploy) |
| DB migrate | `bun run db:migrate` |
| DB gen | `bun run db:generate` (drizzle-kit) |
| Add dep | `bun add <pkg> --cwd app` (or `worker`, `packages/shared`) |
| Cap sync | `cd app && bun run cap:sync` (builds + syncs to native) |
| Cap sync ios | `cd app && bun run cap:sync:ios` (single platform) |
| Cap open ios | `cd app && bun run cap:open:ios` (Xcode) |
| Cap open android | `cd app && bun run cap:open:android` (Android Studio) |
| Cap assets | `cd app && bun run cap:assets` (generate icons/splash) |

## Biome formatting (repo-wide)

single quotes, no semicolons (`asNeeded`), trailing commas, 140 line width, 2 space indent. Bible JSON files excluded from lint (`!app/public/bible*.json`).

## Architecture

- **app/** — React 19 + Vite 8 + TanStack Router 1 SPA. Offline-first via Dexie.js (IndexedDB). ts-fsrs for SRS. PWA via vite-plugin-pwa. Capacitor v8 for native iOS/Android.
- **worker/** — Cloudflare Worker (Hono 4, Drizzle, D1 SQLite). Auth: JWT HS256 (30d). Sync: push/pull endpoints.
- **packages/shared/** — Zod schemas, bible constants, translation keys. Imported as `shared` workspace dep.
- Frontend auth: React Context + localStorage JWT. No dedicated auth routes — modal overlay.
- Cross-device sync: 30s interval + visibility/online events. Exponential backoff (max 120s).
- Bible data: 6 PT-BR translations in `app/public/bible-{key}.json[.br]` (lazy-loaded, brotli preferred).
- Non-bible texts in `app/public/textos/{id}.json`: Apostles Creed, Nicene Creed, Heidelberg Catechism (128 Q&A, flat single-section), Westminster Shorter Catechism. Catechism answers are clean prose — no inline footnote markers or scripture references.
- Non-bible seeding: `seedNonBibleText` in `db.ts` uses `NON_BIBLE_SEED_VERSIONS` (keyed by `sourceId`) + `localStorage['seed_v:{sourceId}']` to detect stale data and force re-seed. **Bump the version string there whenever catechism/creed JSON content changes.**

## Conventions

- **Max component size: 150 lines.** Split into smaller components or hooks when exceeded.
- **Prefer native**. Use platform APIs over third-party libraries when possible. Avoid adding dependencies for functionality available in the runtime (Web APIs, Bun APIs, Cloudflare Workers runtime). In Capacitor, prefer built-in plugins (Camera, Filesystem, Haptics, etc.) over third-party wrappers or Cordova plugins.
- **Mobile-first design**. All UI built for mobile first, desktop as enhancement.
- **No `any` type**. Use `unknown` + narrowing, or proper types. Only use `unknown` when truly needed.
- **Tests exist**: Vitest (unit) + Playwright (layout/smoke). 113 unit tests, 54 layout tests across mobile + desktop.
- **PWA testing workflow**: `bun run check:layout` (Playwright mobile smoke, 390x844) → `bun run test:unit` (Vitest) → actual iPhone PWA standalone.
- `app/.env`: `VITE_API_URL=http://localhost:8787` for local worker dev.
- `worker/.dev.vars`: `JWT_SECRET` for local auth.
- Deploy: Cloudflare Workers + Assets (no separate static host).
- Capacitor: `app/capacitor.config.ts` (appId: `com.verbumvitae.app`, webDir: `dist`). Native projects at `app/android/` and `app/ios/` (gitignored). Plugins: StatusBar (dark, #0f1117), SplashScreen, Keyboard (dark style, no resize), Share. URL schemes: iOS `vvitae://`, Android `https`.
- Capacitor build: set `VITE_API_URL` to full production URL (e.g. `https://verbum-vitae.pages.dev`) in `app/.env` when building for native, since there's no local server.
- PWA components (install button, update banner) auto-disable on native via `Capacitor.isNativePlatform()`.
- CI/CD: configured on Cloudflare dashboard (no in-repo config).
- Non-bible browse navigation: when `source.sectionCount === 1`, a `useEffect` in `browse.tsx` and `collections.$slug.add.tsx` auto-sets `bookIndex=0, chapter=1`, skipping the section-list step. No back button is rendered for single-section sources. `sectionCount` in `AVAILABLE_SOURCES` must match the actual number of sections in the JSON.

## `user-select` conventions

- `.verse-row` (browse list button): `user-select: none` — prevents accidental drag-selection on tap/swipe. **Exception:** `.verse-text` inside it overrides to `user-select: text` so the verse content is copyable.
- `.flashcard-hint` (review prompt): `user-select: none` — UI chrome, not content.
- Revealed flashcard text, catechism Q&A in collections: selectable by default (no override needed).
- UI buttons, labels, stats: naturally non-selectable as `<button>` elements.

## UI rules

- `touch-action: manipulation`; `overscroll-behavior: contain` in modals
- Full-bleed layouts: `env(safe-area-inset-*)`; flex children: `min-w-0`
- `color-scheme: dark` on `<html>`; `<meta name="theme-color">` matches bg
- Animate `transform`/`opacity` only; honor `prefers-reduced-motion`
- `aria-label` on icon buttons; `aria-hidden="true"` on decorative icons
- `<button>` for actions, `<a>`/`<Link>` for nav — never `<div onClick>`
- Inputs: `autocomplete`, correct `type`, `<label>`, no paste block
- Text: `…` not `...`; curly quotes; `"Carregando…"` not `"Loading..."`

### Never
- `user-scalable=no` / `maximum-scale=1`
- `transition: all`
- `outline-none` without `focus-visible` replacement
- Images without `alt` + dimensions
- `autoFocus` without justification
