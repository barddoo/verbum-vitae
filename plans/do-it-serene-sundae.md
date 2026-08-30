# Plan: Server-rendered landing page for SEO

## Context

The app is a CSR SPA — Googlebot must execute JS to see page content. The `index.html` already has good meta/OG/JSON-LD tags, so social sharing works. The gap is search ranking: the headline, features, and CTAs are locked behind JS execution. Fix: Hono intercepts `GET /` before the SPA catch-all, fetches `index.html` from ASSETS, injects pre-rendered landing content into `#root`, and returns enhanced HTML with a proper `Cache-Control` header. Crawlers see real content; React mounts normally and overwrites `#root`. Also fix `sitemap.xml` which still references the old `/stats` route (renamed to `/profile`).

---

## Changes

### 1. `worker/src/landing.ts` (new file)

Export one function: `injectLandingContent(indexHtml: string): string`

- Matches the hero from `app/src/routes/index.tsx` (empty-state branch): headline, subtitle, three feature chips, two CTAs, "Grátis · Sem cadastro" footer
- Injects a `<style>` block with critical CSS (dark bg `#0f1117`, card bg `#1a1f2e`, gold `#c9a84c`, text `#e8e6f0`, muted `#7a7a9a`) so it renders correctly before the app CSS loads
- Replaces `<div id="root"></div>` → `<div id="root"><style>…</style><div id="ssr-landing">…</div></div>`
- React's `createRoot().render()` replaces `#root`'s children on mount — no hydration mismatch

### 2. `worker/src/index.ts`

Add a `GET /` route **before** the `GET *` catch-all (consistent with the existing robots.txt / sitemap.xml pattern):

```ts
import { injectLandingContent } from './landing'

app.get('/', async (c) => {
  const origin = new URL(c.req.url).origin
  const res = await c.env.ASSETS.fetch(new Request(`${origin}/index.html`))
  const html = injectLandingContent(await res.text())
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  })
})
```

No other routes change. The `GET *` catch-all remains for `/browse`, `/review`, etc.

### 3. `app/public/sitemap.xml`

- Replace `/stats` → `/profile` (route was renamed in commit `1b9f6d4`)
- Update all `<lastmod>` dates to today (`2026-07-03`)
- Keep `/review` and `/collections` entries (they're reachable without auth)

---

## What this does NOT do

- No SSR for inner routes (`/browse`, `/collections`, etc.) — out of scope
- No per-route canonical URL fix — all non-root routes still return `index.html` with `canonical: vvitae.com/`; the sitemap handles discoverability
- No OG image upgrade

---

## Verification

1. `bun run dev` + `curl -s http://localhost:5173/` (or worker port 8787) — response body should contain `ssr-landing` div and `Memorize a Bíblia`
2. Open browser at `/` — landing content visible briefly, then React mounts and renders the full app normally
3. Check console for hydration warnings (expect none — `createRoot` replaces, doesn't hydrate)
4. View source on `/` — confirm `<div id="root">` is not empty
5. Validate sitemap at `https://vvitae.com/sitemap.xml` — `/profile` present, `/stats` gone
