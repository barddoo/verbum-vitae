# Verbum Vitae

Portuguese Bible memorization PWA using spaced repetition (FSRS).

Live: **vvitae.com**

## Features

- 6 PT-BR translations (NAA default)
- 3 review modes: Flashcard, Fill-in-the-blank, Typing from memory
- FSRS spaced repetition algorithm
- Curated collections (Fruto do Espírito, etc.)
- Offline-first (IndexedDB + service worker)
- Optional cross-device sync via Cloudflare D1
- PWA — installable on mobile

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React, TypeScript, TanStack Router, Vite |
| Storage | Dexie.js (IndexedDB) |
| Sync | Cloudflare Workers + D1 (SQLite) |
| Auth | Email/password + JWT (see [AUTH.md](AUTH.md)) |
| SRS | [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) |
| Deploy | Cloudflare Workers + Assets |

## Development

```bash
bun install
bun run dev          # starts Vite dev server
bun run build        # production build
bun run deploy       # apply remote D1 migrations + build + deploy
bun run check        # TypeScript + Biome lint
bun run fix          # auto-fix lint issues
```

Worker dev (with D1):

```bash
cd worker
bunx wrangler dev
```

## Project structure

```
app/          React SPA (Vite)
  src/
    routes/   Page components (TanStack Router)
    lib/      db.ts, srs.ts, auth.tsx, sync.ts
    components/
  public/     bible-{key}.json + .br (bible data)
worker/       Cloudflare Worker (Hono)
  src/        auth.ts, sync.ts, index.ts
  db/         Drizzle schema + D1 migrations
packages/
  shared/     Types, TRANSLATIONS, BOOKS (shared by app + worker)
scripts/      Bible fetch/convert utilities
docs/         Additional documentation
```

## Translations

Six PT-BR translations are bundled as static JSON files served by the CDN.

| App key | Name |
|---------|------|
| `naa` *(default)* | Nova Almeida Atualizada |
| `ara` | Almeida Revista e Atualizada |
| `acf` | Almeida Corrigida Fiel |
| `nvi` | Nova Versão Internacional |
| `a21` | Almeida Século 21 |
| `nvt` | Nova Versão Transformadora |

Source: **[bolls.life](https://bolls.life)** API / [Bolls-Bible/bain](https://github.com/Bolls-Bible/bain) GitHub mirror.

### Adding or re-generating a translation

**From the bolls.life API** (slow, ~2 min per translation):

```bash
bun scripts/fetch-bible.ts <BOLLS_CODE> <app-key>
# e.g.
bun scripts/fetch-bible.ts NAA naa
bun scripts/fetch-bible.ts NVIPT nvi   # note: NVI = Spanish, use NVIPT for PT-BR
bun scripts/fetch-bible.ts ALM21 a21   # note: A21 is unrecognized, use ALM21
```

**From a cached GitHub JSON** (fast):

```bash
# Download
gh api repos/Bolls-Bible/bain/contents/django/bolls/static/translations/NAA \
  --jq '.[] | select(.name | endswith(".json")) | .download_url' \
  | xargs -I'{}' curl -L -o /tmp/NAA.json '{}'

# Convert + compress
bun scripts/convert-bolls.ts /tmp/NAA.json naa
```

Both scripts strip HTML tags (including `<sup>` footnote markers) and output `app/public/bible-{key}.json` + a brotli-compressed `.br` sibling. Bible files are not precached by the service worker — they're fetched on first use and cached for 1 year.

## Environment variables

### Worker (`.dev.vars` locally, Cloudflare dashboard in prod)

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Signs/verifies JWTs |

### Frontend (`.env.local`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `/api` | Worker base URL |

## Database

D1 migrations live in `worker/db/migrations/`. Wrangler uses that path via `worker/wrangler.toml`.

```bash
# Local
bun run db:migrate

# Production
bun run db:migrate:remote

# Production deploy also runs remote migrations first
bun run deploy
```

If a migration was applied manually with `wrangler d1 execute`, first verify the schema change exists, then mark the migration as applied so future `migrations apply` stays clean:

```bash
cd worker

# Example: verify unique progress index exists
bunx wrangler d1 execute verbum-vitae --remote \
  --command "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_progress_user_verse_translation_unique';"

# Mark migration history only after verification
bunx wrangler d1 execute verbum-vitae --remote \
  --command "INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0002_unique_progress_verse.sql');"
```

## License

MIT — see [LICENSE](LICENSE).
