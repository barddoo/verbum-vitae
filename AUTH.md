# Auth Architecture

## Stack

- **Backend**: Hono + JWT (`hono/jwt`) on Cloudflare Workers (D1 SQLite via Drizzle)
- **Frontend**: React Context + localStorage (TanStack Router SPA)
- **No third-party auth** (self-contained email/password)

---

## Backend (`worker/src/auth.ts`)

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account (email + password ≥ 8 chars). **403** if the password was found in a data breach (Cloudflare leaked credentials) |
| POST | `/api/auth/login` | Authenticate, return JWT. Response includes `leakedCredentials: boolean` |

### Password Hashing

SHA-256 via `crypto.subtle.digest` (Web Crypto API). Hex-encoded.

### JWT

- Signed with HS256 via `hono/jwt` `sign()`
- Secret: `c.env.JWT_SECRET` (env binding)
- Expiry: 30 days (`iat` + `exp` claims)
- Payload: `{ sub: userId, email, iat, exp }`

### Auth for Protected Routes

`worker/src/sync.ts` uses `getUser(c)` helper:
```
Authorization: Bearer <token>
```
- Extracts token, verifies with `hono/jwt` `verify()`
- Returns `{ sub, email }` or `null` (→ 401)

### Leaked Credentials (Cloudflare WAF)

Origin-side handling of [Cloudflare leaked credentials detection](https://developers.cloudflare.com/waf/detections/leaked-credentials/):

- Cloudflare scans auth requests and, when a leak is found, injects an `Exposed-Credential-Check` request header (value `1` pair / `2` username / `3` similar pair / `4` password). Requires the **Add Leaked Credentials Checks Header** managed transform to be enabled (Rules → Transform Rules → Managed transforms).
- `worker/src/auth.ts` parses that header (`parseLeakedCheckHeader`) — no extra network call, no credits.
- **Register** (`/register`): rejects with `403` when the password is password-related leak (values 1, 3, 4). Username-only leaks (2) don't block.
- **Login** (`/login`): authenticates normally but returns `leakedCredentials: true`; the app shows a dismissible warning banner. Login is not blocked because there is no password-reset flow yet.
- The check silently no-ops when the header is absent (transform off or no leak detected).

---

## Frontend (`app/src/lib/auth.tsx`)

### AuthProvider (React Context)

| State | Storage | Purpose |
|-------|---------|---------|
| `user` | memory | `{ id, email }` decoded from JWT payload |
| `token` | `localStorage('auth_token')` | Raw JWT for API calls |
| `isOnline` | memory | `navigator.onLine` listener |

### Flow

1. **Init**: Reads token from localStorage → decodes JWT payload → sets `user`
2. **Login**: POST `/api/auth/login` → saves token to localStorage → sets state
3. **Register**: POST `/api/auth/register` → same as login
4. **Logout**: Removes token from localStorage → clears state → stops auto-sync
5. **Auto-sync**: `startAutoSync()` runs when `token` + `isOnline` are both true (30s interval)

### API Client (`app/src/lib/worker.ts`)

Base URL: `import.meta.env.VITE_API_URL || '/api'`

Auto-attaches `Authorization: Bearer <token>` from localStorage on every request.

---

## Data Model

### `users` table (D1/Drizzle)

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | `crypto.randomUUID()` |
| `email` | text, unique | From form input |
| `password_hash` | text | SHA-256 hex digest |
| `created_at` | text | ISO 8601 |

### Token Storage

- **localStorage** key `auth_token`
- JWT decoded client-side: `atob(token.split('.')[1])` to extract `sub` + `email`
- No refresh token — single JWT with 30-day expiry

---

## Route Protection

**None.** All routes publicly accessible. Auth is optional — required only for cross-device sync. Protected routes (`/api/sync/*`) reject unauthenticated requests server-side with 401.

---

## Auth UI

- **Login/Register**: `AuthModal` component (`app/src/components/auth-modal.tsx`)
  - Tabs to switch between "Entrar" and "Criar Conta"
  - Opens from "Entrar" button in nav bar (when not logged in)
  - Closes on X, backdrop click, or successful auth
- **User info**: Email displayed in top-bar when logged in
- **Logout**: "Sair" button in top-bar
- **No dedicated `/login` or `/register` routes** — modal overlay only

---

## Environment

### Worker

| Binding | Source | Default |
|---------|--------|---------|
| `DB` | `wrangler.toml` (D1) | — |
| `JWT_SECRET` | `.dev.vars` / Cloudflare dashboard | — |

### Frontend

| Env Var | Purpose | Default |
|---------|---------|---------|
| `VITE_API_URL` | Worker base URL for API calls | `/api` (same origin in prod) |

---

## Security Notes

- SHA-256 for passwords (no salt, no bcrypt/argon2) — acceptable for offline-first personal tool, insufficient for high-security apps
- JWT secret should be unique per environment, rotated if leaked
- No refresh token rotation — single long-lived JWT (30d)
- CORS allows all origins (`origin: '*'`) — tighten in production
