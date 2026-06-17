# Verbum Vitae — AGENTS.md

Bun monorepo. Workspaces: `app`, `worker`, `packages/*`. **PT-BR only. PWA.**

## Commands (run from root)

| What | How |
|------|-----|
| Dev app | `bun run dev` (Vite :5173) |
| Dev worker | `cd worker && bunx wrangler dev` (:8787) |
| Full check | `bun run check` → runs `check:ts` then `check:biome` |
| Typecheck | `bun run check:ts` (runs in order: shared → worker → app) |
| Lint/fix | `bun run fix` (Biome --write --unsafe) |
| Build+deploy | `bun run deploy` (builds app, wrangler deploy) |
| DB migrate | `bun run db:migrate` |
| DB gen | `bun run db:generate` (drizzle-kit) |
| Add dep | `bun add <pkg> --cwd app` (or `worker`, `packages/shared`) |

## Biome formatting (repo-wide)

single quotes, no semicolons (`asNeeded`), trailing commas, 140 line width, 2 space indent. Bible JSON files excluded from lint (`!app/public/bible*.json`).

## Architecture

- **app/** — React 19 + Vite 8 + TanStack Router 1 SPA. Offline-first via Dexie.js (IndexedDB). ts-fsrs for SRS. PWA via vite-plugin-pwa.
- **worker/** — Cloudflare Worker (Hono 4, Drizzle, D1 SQLite). Auth: JWT HS256 (30d). Sync: push/pull endpoints.
- **packages/shared/** — Zod schemas, bible constants, translation keys. Imported as `shared` workspace dep.
- Frontend auth: React Context + localStorage JWT. No dedicated auth routes — modal overlay.
- Cross-device sync: 30s interval + visibility/online events. Exponential backoff (max 120s).
- Bible data: 6 PT-BR translations in `app/public/bible-{key}.json[.br]` (lazy-loaded, brotli preferred).

## Conventions

- **Mobile-first design**. All UI built for mobile first, desktop as enhancement.
- **No `any` type**. Use `unknown` + narrowing, or proper types. Only use `unknown` when truly needed.
- **Tests exist**: Vitest (unit) + Playwright (layout/smoke). 113 unit tests, 54 layout tests across mobile + desktop.
- **PWA testing workflow**: `bun run check:layout` (Playwright mobile smoke, 390x844) → `bun run test:unit` (Vitest) → actual iPhone PWA standalone.
- `app/.env`: `VITE_API_URL=http://localhost:8787` for local worker dev.
- `worker/.dev.vars`: `JWT_SECRET` for local auth.
- Deploy: Cloudflare Workers + Assets (no separate static host).
- CI/CD: configured on Cloudflare dashboard (no in-repo config).

## React performance rules (Vercel best practices)

### Eliminating Waterfalls (CRITICAL)
- `async-defer-await` — Move await into branches where actually used
- `async-parallel` — Use Promise.all() for independent async operations
- `async-dependencies` — Use better-all for partial dependencies
- `async-suspense-boundaries` — Use Suspense to stream, not block rendering

### Bundle Size (CRITICAL)
- `bundle-barrel-imports` — Import directly from module, avoid barrel (index) re-exports
- `bundle-dynamic-imports` — `React.lazy()` for heavy components
- `bundle-defer-third-party` — Load analytics/logging after hydration/idle
- `bundle-conditional` — Load modules only when feature activated
- `bundle-preload` — Preload on hover/focus for perceived speed

### Data Fetching
- `client-swr-dedup` — Use SWR or similar for request deduplication
- `server-serialization` — Minimize data passed to client components
- `server-parallel-fetching` — Co-locate data fetching with component that needs it

### Re-render Optimization
- `rerender-defer-reads` — Don't subscribe to state only used in callbacks
- `rerender-memo` — Wrap expensive sub-trees in memo (React.memo, useMemo)
- `rerender-dependencies` — Use primitive values as effect/useMemo deps
- `rerender-derived-state` — Subscribe to derived booleans, not raw values
- `rerender-functional-setstate` — Functional setState for stable callbacks
- `rerender-lazy-state-init` — `useState(() => expensive())` not `useState(expensive())`
- `rerender-transitions` — `startTransition` / `useDeferredValue` for non-urgent updates

### Rendering Performance
- `rendering-content-visibility` — `content-visibility: auto` for long lists
- `rendering-hoist-jsx` — Extract static JSX outside component body
- `rendering-hydration-no-flicker` — Inline script for client-only initial data
- `rendering-conditional-render` — Ternary (`cond ? <A/> : null`), not `&&`

### JavaScript Performance
- `js-index-maps` — Build Map for repeated lookups (O(1) vs O(n))
- `js-cache-property-access` — Cache object property in loop variable
- `js-cache-function-results` — Module-level Map for expensive computations
- `js-combine-iterations` — One loop vs multiple filter/map chains
- `js-length-check-first` — Check array length before expensive comparison
- `js-early-exit` — Return early, flatten nesting
- `js-hoist-regexp` — RegExp outside loops/functions
- `js-set-map-lookups` — Set/Map over Array.includes for membership checks
- `js-batch-dom-css` — Group CSS changes via classes, not individual styles

## Web Interface Guidelines

### Accessibility & Semantic HTML
- Icon-only buttons need `aria-label`; decorative icons `aria-hidden="true"`
- Form controls need `<label>` or `aria-label`; labels clickable (`htmlFor`)
- Use `<button>` for actions, `<a>`/`<Link>` for navigation (never `<div onClick>`)
- Images need `alt` (or `alt=""` if decorative) + `width`/`height` (prevents CLS)
- Async updates (toasts, validation) need `aria-live="polite"`
- Headings hierarchical `<h1>`–`<h6>`

### Forms
- Inputs need `autocomplete` and correct `type` (`email`, `tel`, `url`, `number`)
- Never block paste (`onPaste` + `preventDefault`)
- `spellCheck={false}` on emails, codes, usernames
- Submit button stays enabled until request starts; spinner during request
- Errors inline next to fields; focus first error on submit
- Placeholders end with `…` and show example pattern

### Focus States
- Interactive elements need visible focus: `focus-visible:ring-*` or equivalent
- Never `outline-none` without `:focus-visible` replacement
- Use `:focus-visible` over `:focus` (avoid focus ring on click)

### Typography & Copy
- `…` not `...`; curly quotes `"` `"` not straight `"`
- Loading states: `"Carregando…"`, `"Salvando…"`
- Specific button labels: `"Salvar versículo"` not `"Continuar"`
- `font-variant-numeric: tabular-nums` for number columns

### Content Handling
- Text containers handle long content: `truncate`, `line-clamp-*`, or `break-words`
- Flex children need `min-w-0` to allow text truncation
- Handle empty states—don't render broken UI for empty strings/arrays

### Touch & Interaction
- `touch-action: manipulation` (prevents double-tap zoom delay)
- `overscroll-behavior: contain` in modals/drawers/sheets
- `autoFocus` sparingly—single primary input only; avoid on mobile

### Safe Areas & Layout
- Full-bleed layouts need `env(safe-area-inset-*)` for notches
- Flex/grid over JS measurement for layout
- Avoid unwanted scrollbars: `overflow-x-hidden` on containers

### Images & Performance
- Below-fold images: `loading="lazy"`; above-fold: `fetchpriority="high"`
- Large lists (>50 items): virtualize or `content-visibility: auto`

### Animation
- Honor `prefers-reduced-motion` (reduce or disable)
- Animate `transform`/`opacity` only; never `transition: all`

### Dark Mode & Theming
- `color-scheme: dark` on `<html>` for dark themes
- `<meta name="theme-color">` matches page background

### Anti-patterns (never do these)
- `user-scalable=no` / `maximum-scale=1` (disabling zoom)
- `onPaste` with `preventDefault`
- `transition: all`
- `outline-none` without `focus-visible` replacement
- `<div>` or `<span>` with click handlers (use `<button>`)
- Images without dimensions
- Form inputs without labels
- Icon buttons without `aria-label`
- `autoFocus` without clear justification
