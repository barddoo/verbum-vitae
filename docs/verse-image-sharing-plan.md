# Verse Image Sharing — Implementation Plan

> Select verses in Browse → open the image creator → pick a background (curated photo, gradient, or your own photo) → adjust blur/brightness/font → preview → share as PNG via the native share sheet.

YouVersion-style: photographic backgrounds, story + square formats, legibility-first text overlay. Fully offline, zero network egress. Sharing is native-first: best-possible share on iOS/Android via Capacitor plugins, graceful web fallback for the PWA.

> **Plugin approval required:** native sharing uses `@capacitor/share` + `@capacitor/filesystem` (official Capacitor core plugins — no network, no account, no egress). Per org policy, get sign-off before adding. The feature degrades to the web share path if not approved.

## How YouVersion does it (reference)

Their Verse Image creator: background = stock photo **or your own device photo**; text controls = font, size, letter-spacing, line-height, alignment, opacity; background controls = **blur + brightness**; plus a "shape" mask. Share to feed/SMS/email/social.

We replicate the high-value subset that works offline in a PWA/WebView: curated bundled photos + gradients + own-photo upload, blur/brightness, auto scrim, font/alignment/size, square + story formats. (Letter-spacing, line-height, text-opacity, shape masks → v2.)

Sources: [help.youversion.com — Verse Images](https://help.youversion.com/l/en/article/x2qwuszjaf-verse-images), [blog.youversion.com — own photos](https://blog.youversion.com/2015/04/youversion-bible-app-verse-image-new-choose-your-own-photos/).

## Engine decision: Canvas 2D (not html-to-image, not Satori)

Once backgrounds are photos with blur/brightness, the DOM-capture approach is the wrong tool.

| Option | Verdict |
|--------|---------|
| `html-to-image` | DOM clone + browser render. Web-font double-render flicker (must capture twice); blur/brightness over a photo is awkward; +15KB dep. ❌ |
| `satori` | Deterministic, text-as-path, great offline — but **no WOFF2** support; our `@fontsource-variable` fonts are woff2, so we'd have to bundle TTFs. Friction + wasm weight. ❌ |
| **Canvas 2D** | Draw image → `ctx.filter = 'blur() brightness()'` → dark scrim → wrap text. **Zero deps**, deterministic, light, `await document.fonts.ready` eliminates font flicker. Mirrors YouVersion's own pipeline. ✅ |

**No new dependencies. No Capacitor plugins.**

## Architecture

```
app/
├── public/bg/                          ← NEW: ~20 curated WebP backgrounds (lazy + SW-precached)
└── src/
    ├── lib/
    │   ├── verse-canvas.ts             ← NEW: Canvas 2D rendering (draw + blob)
    │   ├── verse-backgrounds.ts        ← NEW: background registry (photos + gradients)
    │   └── sharing.ts                  ← MODIFY: add shareImageBlob() (reuse existing share/fallback)
    ├── components/verse-image/
    │   ├── verse-image-modal.tsx       ← NEW: modal, lazy-loaded
    │   ├── background-carousel.tsx     ← NEW: swipeable thumbnails + "use my photo"
    │   └── verse-image-controls.tsx    ← NEW: font / align / size / blur / brightness
    ├── routes/browse/
    │   ├── selection-bar.tsx           ← MODIFY: add "Imagem" action
    │   └── browse.tsx                  ← MODIFY: wire modal state + selected-verse data
    └── styles/
        ├── components/verse-image-modal.css  ← NEW: reuse .modal-* classes + specifics
        └── index.css                         ← MODIFY: add CSS import
```

## Progress

| Phase | Status | File(s) |
|-------|--------|---------|
| 1 — Background registry | ✅ done | `app/src/lib/verse-backgrounds.ts` (20 lines) |
| 2 — Canvas rendering engine | ✅ done | `app/src/lib/verse-canvas.ts` (260 lines) |
| 3 — Background carousel | ✅ done | `app/src/components/verse-image/background-carousel.tsx` (73 lines) |
| 4 — Controls | ✅ done | `app/src/components/verse-image/verse-image-controls.tsx` (137 lines) |
| 5 — Modal | ✅ done | `app/src/components/verse-image/verse-image-modal.tsx` (196 lines, lazy-loaded) |
| 6 — Share integration | ✅ done | `app/src/lib/sharing.ts` (110 lines, added `shareImageBlob`) |
| 7 — SelectionBar + browse wiring | ✅ done | `app/src/routes/browse/selection-bar.tsx` (44 lines), `app/src/routes/browse.tsx` (502 lines) |
| 8 — CSS | ✅ done | `app/src/styles/components/verse-image-modal.css` (271 lines) + `index.css` import |
| 9 — Fonts | ✅ n/a | already loaded via `@fontsource-variable` |

## Phase 1 — Background assets

> ✅ **Registry done** (`verse-backgrounds.ts`). Photo assets pending — user will provide source images.

`app/public/bg/` — ~20 curated WebP images (~1200×1200 and/or 1080×1920), quality ~70 → 40–90KB each, ~1–2MB total. Themes: sky, nature, mountains, water, paper/texture, dark abstract. Lazy-loaded (never in the JS bundle) and added to the PWA precache list so they work fully offline after first install.

`verse-backgrounds.ts` exports a typed registry:

```ts
type Background =
  | { kind: 'photo'; id: string; thumb: string; full: string; name: string }
  | { kind: 'gradient'; id: string; css: string; stops: [string, string]; name: string }

export const BACKGROUNDS: Background[] = [ /* photos first, gradients after */ ]
```

Gradients (carried over, rendered as canvas linear gradients): Ink `#0f1117→#1a1f2e`, Deep Purple, Forest, Earth, Twilight, Ocean, Sunset, Olive, Night Sky, Teal.

## Phase 2 — Canvas rendering engine ✅ done

`app/src/lib/verse-canvas.ts` — 218 lines. Full implementation of:

```ts
interface DrawOpts { /* renamed to VerseImageOpts */ }
export async function renderVerseCard(canvas: HTMLCanvasElement, opts: VerseImageOpts): Promise<void>
export function toBlob(canvas: HTMLCanvasElement, quality?: number): Promise<Blob>
```

Pipeline inside `renderVerseCard`:
1. Size canvas to format (square 1080² / story 1080×1920) — exact dimensions, no DPR scaling for export.
2. `await document.fonts.load('1em <family>')` for both Nunito + Fraunces, then `document.fonts.ready` (kills font flicker).
3. Draw background: photo/custom image cover-fit with `ctx.filter = blur(${blur}px) brightness(${brightness})`, or canvas linear gradient.
4. Reset filter → paint dark scrim (vertical `rgba(0,0,0,0.08)→rgba(0,0,0,0.5)→rgba(0,0,0,0.08)` gradient) for legibility over any photo.
5. Word-wrap + draw verse text (Fraunces/Nunito families, size from `fontScale`, align), with subtle text shadow.
6. Draw reference line `— Gênesis 1:1 (NVI)`, a gold divider, and `Verbum Vitae` footer.
7. Multi-verse support: joins texts with space, formats refs with en-dash range (`Gênesis 1:1 – 1:3 (NVI)`).
8. Max-line truncation with smart ellipsis (`…`) — Story: 15 lines, Square: 7 lines.

Key constants: FONT_BODY = `"Nunito Variable", system-ui, sans-serif`, FONT_DISPLAY = `"Fraunces Variable", Georgia, serif`. Colors match `reset.css` tokens (`#e8e6f0` parchment, `#c9a84c` gold, `#7a7a9a` aged).

```
┌──────────────────────────────┐
│                              │
│  "No princípio criou Deus    │
│   os céus e a terra."        │
│                              │
│       — Gênesis 1:1 (NVI)    │
│       ───────────            │
│       Verbum Vitae           │
└──────────────────────────────┘
```

## Phase 3 — Background carousel + own photo

`app/src/components/verse-image/background-carousel.tsx`

- Horizontal swipeable thumbnail strip (`overflow-x` scroll, `scroll-snap`, `touch-action: pan-x`). Selected = gold ring.
- First tile = **"Usar minha foto"** → hidden `<input type="file" accept="image/*">`. Read via `URL.createObjectURL` → `Image` → pass as `customImage`. No Capacitor plugin, no egress; works in iOS/Android WebView and PWA.
- Photo thumbs use `loading="lazy"`, fixed `width`/`height` (no CLS).

## Phase 4 — Controls

`app/src/components/verse-image/verse-image-controls.tsx`

- **Formato:** segmented `[Quadrado] [Story]` (default Story).
- **Fonte:** segmented `[Nunito] [Fraunces]`.
- **Alinhamento:** `[Esq] [Centro]`.
- **Tamanho do texto:** range slider (`fontScale`).
- **Desfoque / Brilho:** two range sliders (only meaningful for photos; hide for gradients).

All sliders: `aria-label`, `touch-action: manipulation`.

## Phase 5 — Modal

`app/src/components/verse-image/verse-image-modal.tsx`, **`React.lazy`-loaded** from browse.

```
┌─────────────────────────────────┐
│  Criar Imagem                 ✕ │
├─────────────────────────────────┤
│ ┌─────────────┐                 │
│ │ LIVE <canvas>│  ← real canvas, │
│ │  (story 9:16)│    redraws on   │
│ └─────────────┘    every change  │
│                                 │
│  [Quadrado] [Story]             │
│  Fonte: [Nunito][Fraunces]      │
│  Alinhamento: [Esq][Centro]     │
│  Tamanho  ▭▬▭▭                  │
│  Desfoque ▭▬▭▭  Brilho ▭▭▬▭     │
│                                 │
│  Fundo: [📷][img][img][◆][◆]→  │  ← swipe carousel
│                                 │
│       [Compartilhar]            │  ← primary (gold)
│       [Salvar imagem]           │  ← secondary (download)
└─────────────────────────────────┘
```

- The preview **is** the live `<canvas>` (single source of truth — same code renders preview and the shared file). Redraw on any setting change, debounced.
- Reuse existing modal CSS conventions: `.modal-overlay` (click-close), `.modal-card`, `.modal-header`, `.modal-title`, `.modal-close`, `.modal-actions`, `role="dialog" aria-modal="true"` — matches `collection-form-modal.tsx`. Add Escape-to-close.

```ts
interface VerseImageModalProps {
  open: boolean
  onClose: () => void
  verses: { ref: string; text: string }[]
  translation: string
  bookName: string
}
```

## Phase 6 — Share integration (native-first, web fallback)

Native and web take different paths so the share experience is the best each platform can offer. Both live in `app/src/lib/sharing.ts` (add to the existing module — do **not** create a parallel file). Plugins are lazy-imported so the web/PWA bundle never pays for them.

```ts
import { Capacitor } from '@capacitor/core'

export async function shareImageBlob(blob: Blob, title: string): Promise<void> {
  if (Capacitor.isNativePlatform()) return shareNative(blob, title)
  return shareWeb(blob, title)
}

// Native (iOS/Android): write PNG to cache, share the file URI via the OS sheet — reliable on every Android.
async function shareNative(blob: Blob, title: string): Promise<void> {
  const { Share } = await import('@capacitor/share')
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const base64 = await blobToBase64(blob) // strip the data: prefix → raw base64
  const { uri } = await Filesystem.writeFile({
    path: `versiculo-${Date.now()}.png`,
    data: base64,
    directory: Directory.Cache,
  })
  try {
    await Share.share({ title, files: [uri] })
  } catch {
    /* user dismissed the sheet — no-op */
  }
}

// Web/PWA: Web Share Level 2 with feature-detect, download fallback.
async function shareWeb(blob: Blob, title: string): Promise<void> {
  const file = new File([blob], 'versiculo.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] })
      return
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return // user cancelled — do nothing
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'versiculo.png'
  a.click()
  URL.revokeObjectURL(url)
}
```

Rationale for the split:

- **Native** uses `@capacitor/share`, which wraps the OS share intent (`ACTION_SEND` on Android, `UIActivityViewController` on iOS) — rock-solid file sharing on every Android version, not subject to WebView's lagging Web Share Level 2 support. `Share.share` needs a file **path**, so `@capacitor/filesystem` writes the PNG to the cache dir first (auto-evicted by the OS — no cleanup needed).
- **Web** keeps the Web Share Level 2 path with a `canShare({files})` guard (desktop and some browsers reject file shares → download fallback) and **swallows AbortError** so a cancelled share never triggers an unwanted download.

Install (after org approval): `bun add @capacitor/share @capacitor/filesystem --cwd app`, then `cd app && bun run cap:sync`.

## Phase 7 — SelectionBar + browse wiring

`selection-bar.tsx` — add optional `onShareImage?: () => void`; render an "Imagem" action. Three buttons (Limpar / Imagem / Memorizar) risk overflow at 390px → use a short label or icon+label, mobile-first.

`browse.tsx` — add `showImageModal` state; on "Imagem", collect selected verses' `{ ref, text }` (from `sortedSelected` + `verses`) plus `translation` and `bookName`, open the lazy modal.

## Phase 8 — CSS

`app/src/styles/components/verse-image-modal.css` (~120 lines): preview canvas frame (rounded, shadow, aspect-locked per format), carousel strip, segmented toggles, sliders, action buttons. Dark-theme only. Safe-area insets. `touch-action: manipulation`. Desktop modal max-width ~440px. Reuses `.modal-*` base classes — only adds verse-image specifics.

`app/src/styles/index.css` — add `@import "./components/verse-image-modal.css";` (alongside existing `@import "./components/modal.css";`).

## Phase 9 — Fonts

No additions. App already loads Fraunces (`--font-display`, "Fraunces Variable") and Nunito (`--font-body`, "Nunito Variable") via `@fontsource-variable` in `main.tsx`. Canvas reads the same family names after `document.fonts.ready`.

## Summary

| Metric | Value |
|--------|-------|
| New code files | 6 |
| Modified files | 4 |
| New assets | ~20 WebP (~1–2MB, lazy + precached) |
| JS dependencies added | **0** |
| Capacitor plugins added | **2** (`@capacitor/share`, `@capacitor/filesystem` — core, no network; needs org approval) |
| Network egress | **none** (fully offline) |
| Formats | Square 1:1 + Story 9:16 |

## Out of scope (v2+)

| Feature | Reason |
|---------|--------|
| Community/Home feed publishing | YouVersion has a backend social graph; we don't |
| Letter-spacing / line-height / text-opacity / shape masks | Power-user controls; ship core first |
| Set-as-wallpaper | Needs native plugin (org approval) |
| Remote/CDN background gallery | Breaks offline-first; needs egress + connector approval |
| Saved image gallery (IndexedDB) | Share-then-forget is simpler |
| Verse-of-the-Day auto-image | Separate feature, different trigger |

## Decisions & Rationale

- **Canvas 2D over html-to-image/Satori** — once backgrounds are photos with blur/brightness, DOM capture brings font-flicker and clumsy filters; Satori can't load our WOFF2 fonts. Canvas does blur/brightness/scrim natively, is deterministic, adds zero deps, and `document.fonts.ready` removes the flicker entirely.
- **Bundled photos + gradients (not remote)** — org rule gates network egress behind approval and the app is offline-first. ~20 lazy, precached WebP gives the YouVersion look at ~1–2MB without touching the network.
- **Own-photo upload via `<input type=file>`** — replicates YouVersion's headline feature with no plugin and no egress; works in PWA and WebView.
- **Square + Story, default Story** — WhatsApp status / Instagram stories (9:16) is the dominant share surface in Brazil (PT-BR app).
- **Native-first sharing, web fallback** — Web Share Level 2 file sharing is unreliable on Android WebView, so native uses `@capacitor/share` (+ `@capacitor/filesystem` to write the file the share intent needs) for a rock-solid OS share sheet; the PWA keeps the `navigator.share` + `canShare` + download path. Plugins lazy-imported so the web bundle is unaffected. Chosen for best-possible UX on the dominant (Android, BR) platform; requires org plugin approval.
- **Fold sharing into existing `sharing.ts`** — reuse the established `navigator.share` + AbortError + fallback pattern instead of a parallel module.
- **Reuse `.modal-*` CSS** — matches existing modals (`collection-form-modal.tsx`); avoids duplicating overlay/z-index/backdrop.
