# Verbum Vitae — AGENTS.md

Bun monorepo. Workspaces: `app`, `worker`, `packages/*`.

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

- **No tests exist**. No test infra.
- `app/.env`: `VITE_API_URL=http://localhost:8787` for local worker dev.
- `worker/.dev.vars`: `JWT_SECRET` for local auth.
- Deploy: Cloudflare Workers + Assets (no separate static host).
- CI/CD: configured on Cloudflare dashboard (no in-repo config).
