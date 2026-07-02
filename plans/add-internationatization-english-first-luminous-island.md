# Profile Page (replaces Stats page)

## Context

The stats page (`/stats`) shows progress data across 3 tabs but is disconnected from all settings/preferences. Translation selection only exists inside the browse route, locale toggle lives in the bottom nav, theme toggle is in the top bar, and the display name/leaderboard visibility edit is buried in the ranking tab. The user wants a unified **Profile** page at `/profile` that gathers identity, settings, and stats in one place. The `/stats` route and its nav entry are replaced entirely.

---

## Architecture

### Route rename
- `/stats` → `/profile`
- Nav label: `Progresso` → `Perfil` (translated in both locales)
- Nav icon: `BarChart2` → `User` (from lucide-react)
- Remove `LocaleToggle` from bottom nav (locale setting moves into the profile settings tab)

### File operations
| Old | New / action |
|---|---|
| `routes/stats.tsx` | Delete; replaced by `routes/profile.tsx` |
| `routes/stats/ranking-tab.tsx` | Move → `routes/profile/ranking-tab.tsx` |
| `components/memorized-verses-tab.tsx` | Keep as-is, reused |
| `components/locale-toggle.tsx` | Keep; used directly in settings tab instead of nav |

### Profile page layout

**Profile header** (above tabs, always visible):
```
[👤]  Display Name or email prefix
      [✏️ Editar] inline edit — only when logged in
      email (small, muted)
```
If logged out: show email-less placeholder + "Entrar para sincronizar" CTA.

**3 tabs:** Progresso · Configurações · Ranking

---

## Tab contents

### Progresso tab
Lifted from current `routes/stats.tsx` Resumo + Versículos content:
- Stats summary row: total memorized, reviewing today, current streak
- `StreakCalendar` heat-map component (keep as local component inside the tab)
- `MemorizedVersesTab` from `components/memorized-verses-tab.tsx`

### Configurações tab — `routes/profile/settings-tab.tsx`

Five labeled sections following platform conventions (iOS/Android/macOS all separate Language from Appearance). Use `<section>` + `<h3>` pattern matching existing modal heading style.

**Aparência** — visual display only
- Theme: reuse `ThemeToggle` component (`components/theme-toggle.tsx`)

**Idioma & Região** — own section per platform best practice (iOS Settings, Android Settings both isolate Language from Appearance)
- Language: reuse `LocaleToggle` component (`components/locale-toggle.tsx`) — rendered as a proper labeled row (not just the raw toggle button), e.g. `Idioma: [PT-BR | EN]`

**Bíblia**
- Default translation: `<select>` reading/writing `cachedGet/cachedSet('translation')` — same localStorage key used by browse.tsx and collections.$slug.add.tsx. No new context needed; routes read this at mount so the setting takes effect on next navigation.
- Labels via `getTranslationLabels(i18n.locale)` from `packages/shared/src/bible.ts` (already locale-aware)

**Comunidade** (only when user is logged in)
- Leaderboard visibility checkbox — move from `ranking-tab.tsx`, same `api.leaderboard.updateVisibility(hidden)` call

**Zona de perigo**
- "Recomeçar do zero" button — move from `routes/stats.tsx`, same `db.progress.clear()` + `db.syncLog.clear()` flow

### Ranking tab
- Move `routes/stats/ranking-tab.tsx` to `routes/profile/ranking-tab.tsx`
- **Remove** the display name editing section from it (now in profile header)
- Keep: leaderboard list, rank medals, `isCurrentUser` highlight, current user row at bottom, login prompt when unauthenticated

---

## Key implementation details

### Display name edit in header
Extract from `ranking-tab.tsx` into the profile header block inside `routes/profile.tsx`. Same logic: `useState` for edit mode, `updateDisplayName(name)` from `useAuth`.

### Translation setting
No context needed. Profile settings tab writes `cachedSet('translation', tx)`. Browse and collections routes already read from the same key at mount — setting persists immediately to localStorage, takes effect next time either route mounts. This matches how theme/locale work without requiring a full context refactor.

### i18n strings
All new strings use `<Trans>` / `t\`...\`` macros. After implementation, run `bun run i18n:extract` then fill in `en/messages.po`, then `bun run i18n:compile`.

New strings needed (PT-BR source):
- `Perfil` (nav label)
- `Configurações` (tab)
- `Progresso` (tab — already exists)
- `Ranking` (tab — already exists)
- `Aparência`, `Bíblia`, `Comunidade`, `Zona de perigo` (section headings)
- `Idioma`, `Tema`, `Tradução padrão`, `Ocultar do ranking` (setting labels)
- `Editar nome de exibição`, `Salvar`, `Cancelar` (profile header controls)

---

## Files to create/modify

| File | Change |
|---|---|
| `app/src/routes/profile.tsx` | New — profile header + 3-tab layout (≤150 lines) |
| `app/src/routes/profile/settings-tab.tsx` | New — Configurações tab (≤120 lines) |
| `app/src/routes/profile/ranking-tab.tsx` | Moved from `routes/stats/ranking-tab.tsx`, display name section removed |
| `app/src/routes/stats.tsx` | Delete (contents migrated to profile.tsx) |
| `app/src/routes/stats/ranking-tab.tsx` | Delete (moved) |
| `app/src/router.tsx` | `/stats` → `/profile`, icon/label update, remove LocaleToggle from nav |
| `app/src/styles/pages/profile.css` | New — profile page styles (import from index.css) |
| `app/src/styles/index.css` | Add import for profile.css |
| `app/src/locales/pt-BR/messages.po` | Run extract; new strings auto-added |
| `app/src/locales/en/messages.po` | Fill in EN translations for new strings |

---

## Verification

1. `bun run check:ts` — no type errors
2. Browser: navigate to `/profile` — profile header, 3 tabs render
3. Change translation in Configurações → navigate to `/browse` → verify selected translation is active
4. Toggle locale in Configurações → UI strings switch language
5. Edit display name → save → ranking tab shows updated name
6. Leaderboard visibility checkbox works (only when logged in)
7. "Recomeçar do zero" confirm flow works
8. `/stats` route removed — direct navigation redirects or 404s (add redirect in router if needed)
9. `bun run check:ts` clean after i18n extract+compile
