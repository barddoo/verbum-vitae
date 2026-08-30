# Verbum Vitae — AGENTS.md

Bun monorepo. Workspaces: `app`, `worker`, `packages/*`. **PT-BR only. PWA + Capacitor.**

See [`docs/architecture.md`](docs/architecture.md) for stack details, non-bible text seeding, browse navigation, Capacitor, and `user-select` conventions.

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
| Cap sync | `cd app && bun run cap:sync` (builds + syncs to native) |
| Cap sync ios | `cd app && bun run cap:sync:ios` (single platform) |
| Cap open ios | `cd app && bun run cap:open:ios` (Xcode) |
| Cap open android | `cd app && bun run cap:open:android` (Android Studio) |
| Cap assets | `cd app && bun run cap:assets` (generate icons/splash) |

## Biome formatting (repo-wide)

single quotes, no semicolons (`asNeeded`), trailing commas, 140 line width, 2 space indent. Bible JSON files excluded from lint (`!app/public/bible*.json`).

## Conventions

- **Max component size: 150 lines.** Split into smaller components or hooks when exceeded.
- **Prefer native**. Use platform APIs over third-party libraries when possible. In Capacitor, prefer built-in plugins over third-party wrappers.
- **Mobile-first design**. All UI built for mobile first, desktop as enhancement.
- **No `any` type**. Use `unknown` + narrowing, or proper types.
- **Tests exist**: Vitest (unit) + Playwright (layout/smoke). 113 unit tests, 54 layout tests across mobile + desktop.
- **PWA testing workflow**: `bun run check:layout` (Playwright mobile smoke, 390x844) → `bun run test:unit` (Vitest) → actual iPhone PWA standalone.
- `app/.env`: `VITE_API_URL=http://localhost:8787` for local worker dev.
- `worker/.dev.vars`: `JWT_SECRET` for local auth.

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
