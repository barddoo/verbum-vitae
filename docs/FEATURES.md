## Feature 2 — Versículo comunitário semanal

Every week, whole vvitae community memorizes same verse. Inspired by YouVersion's "Plans with Friends" — shared schedules drive conversation. Adapted as shared memorization goal with live completion counter + countdown.

```
Esta semana · Romanos 8:28
"Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus..."
7.241 pessoas memorizaram — falta 1 dia
```

**Stack:** Cron Trigger + Scheduled Worker + D1 + KV + Queue + Consumer Worker

**D1 schema:**

```sql
CREATE TABLE verse_pool (
  id       INTEGER PRIMARY KEY,
  ref      TEXT NOT NULL,   -- "Romanos 8:28"
  text_pt  TEXT NOT NULL
);

CREATE TABLE weekly_verses (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id   INTEGER NOT NULL REFERENCES verse_pool(id),
  week_start TEXT NOT NULL,  -- "2025-01-13" (Monday)
  week_end   TEXT NOT NULL,  -- "2025-01-19" (Sunday)
  UNIQUE(week_start)
);

CREATE TABLE verse_completions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  weekly_verse_id INTEGER NOT NULL REFERENCES weekly_verses(id),
  fingerprint     TEXT NOT NULL,  -- SHA-256(ip + ua + salt)
  city            TEXT,           -- CF-IPCity header, no GPS
  completed_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(weekly_verse_id, fingerprint)
);
CREATE INDEX idx_vc ON verse_completions(weekly_verse_id);
```

**wrangler.toml:**

```toml
[triggers]
crons = ["0 3 * * 1"]   # Mon 03:00 UTC = Mon midnight BRT

[[durable_objects.bindings]]
name       = "PRESENCE"
class_name = "PresenceDO"

[[migrations]]
tag         = "v1"
new_classes = ["PresenceDO"]

[[kv_namespaces]]
binding = "KV"
id      = "YOUR_KV_ID"

[[d1_databases]]
binding       = "DB"
database_name = "vvitae"
database_id   = "YOUR_DB_ID"

[[queues.producers]]
binding = "COMPLETIONS_QUEUE"
queue   = "verse-completions"

[[queues.consumers]]
queue               = "verse-completions"
max_batch_size      = 25
max_batch_timeout   = 5
max_retries         = 3
```

**Scheduled Worker — rotates verse every Monday:**

```js
async scheduled(event, env) {
  const verse = await env.DB.prepare(`
    SELECT id, ref, text_pt FROM verse_pool
    WHERE id NOT IN (
      SELECT verse_id FROM weekly_verses
      WHERE week_start > date('now', '-52 weeks')
    )
    ORDER BY RANDOM() LIMIT 1
  `).first()

  await env.DB.prepare(`
    INSERT INTO weekly_verses (verse_id, week_start, week_end)
    VALUES (?, date('now','weekday 1','-7 days'), date('now','weekday 0'))
  `).bind(verse.id).run()

  await env.KV.put('verse:current', JSON.stringify(verse), { expirationTtl: 300 })
}
```

**GET /api/verse/current — cache-first:**

```js
async function getVerse(req, env) {
  const cached = await env.KV.get("verse:current", "json");
  if (cached) return Response.json(cached);

  const row = await env.DB.prepare(
    `
    SELECT wv.id, vp.ref, vp.text_pt, wv.week_end,
      COUNT(vc.id) AS completions
    FROM weekly_verses wv
    JOIN verse_pool vp ON vp.id = wv.verse_id
    LEFT JOIN verse_completions vc ON vc.weekly_verse_id = wv.id
    WHERE wv.week_start <= date('now') AND wv.week_end >= date('now')
    GROUP BY wv.id LIMIT 1
  `,
  ).first();

  await env.KV.put("verse:current", JSON.stringify(row), {
    expirationTtl: 300,
  });
  return Response.json(row);
}
```

**POST /api/verse/complete — enqueues, no direct write:**

```js
async function recordCompletion(req, env) {
  const { verse_id } = await req.json();
  const ip = req.headers.get("CF-Connecting-IP");
  const ua = req.headers.get("User-Agent");
  const fingerprint = await sha256(ip + ua + env.FINGERPRINT_SALT);

  await env.COMPLETIONS_QUEUE.send({
    verse_id,
    fingerprint,
    city: req.headers.get("CF-IPCity") ?? null,
  });
  return Response.json({ ok: true });
}
```

**Queue Consumer — batch INSERT, idempotent:**

```js
async queue(batch, env) {
  for (const msg of batch.messages) {
    const { verse_id, fingerprint, city } = msg.body
    await env.DB.prepare(`
      INSERT OR IGNORE INTO verse_completions
        (weekly_verse_id, fingerprint, city)
      VALUES (?, ?, ?)
    `).bind(verse_id, fingerprint, city).run()
    msg.ack()
  }
  await env.KV.delete('verse:current')  // force fresh count on next request
}
```

## Key decisions

**Why Queue not direct D1 write?** D1 write throughput limited (~1000 writes/s per DB). Verse goes viral → hit limit. Queue batches 25 completions per Consumer invocation → `UNIQUE` idempotency check cheap, Worker response instant.

**Why single global DO for presence?** One DO handles ~32k concurrent WebSocket connections. Need per-verse presence later → use `idFromName('verse-' + verseId)` to shard automatically.

**Why KV cache not D1 reads?** D1 read latency ~5–20ms. KV ~1ms globally. Verse changes once/week, completion count tolerates 5min staleness — KV correct tool.

---

## Feature 3 — Botão "Amém" aparece na tela dos outros

**Stack:** Durable Object (per-verse) + WebSocket

Tap amen → floating hearts on everyone else's screen. Reuses Feature 1 DO connection — same WebSocket, new message type `{ type: "amen" }`. No storage, fully ephemeral. Rate-limited to 1/5s per socket, enforced in DO via `serializeAttachment`.

```js
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.type === "amen") showAmenAnimation()
}

document.getElementById("amen-btn").onclick = () => {
  ws.send(JSON.stringify({ type: "amen" }))
  showAmenAnimation() // instant feedback for sender
}
```

**Worker routing — per-verse DO, reactions only reach same verse:**
```js
if (pathname.startsWith("/ws/verse/")) {
  const verseId = pathname.split("/")[3]
  const stub = env.PRESENCE.get(env.PRESENCE.idFromName("verse-" + verseId))
  return stub.fetch(req)
}
```

**Per-verse DO — fan-out with hibernation-safe state:**
```js
export class VerseDO {
  async fetch(req) {
    const [client, server] = Object.values(new WebSocketPair())
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ lastAmen: 0 })
    this.broadcastCount()
    return new Response(null, { status: 101, webSocket: client })
  }

  webSocketMessage(ws, raw) {
    const msg = JSON.parse(raw)
    if (msg.type !== "amen") return
    const state = ws.deserializeAttachment()
    const now = Date.now()
    if (now - state.lastAmen < 5000) return
    ws.serializeAttachment({ ...state, lastAmen: now })
    this.broadcastAmen(ws)
  }

  webSocketClose(ws) { this.broadcastCount() }
  webSocketError(ws) { this.broadcastCount() }

  broadcastCount() {
    const sockets = this.ctx.getWebSockets()
    const msg = JSON.stringify({ type: "count", count: sockets.length })
    for (const ws of sockets) try { ws.send(msg) } catch {}
  }

  broadcastAmen(sender) {
    const msg = JSON.stringify({ type: "amen" })
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === sender) continue
      try { ws.send(msg) } catch {}
    }
  }
}
```

### Key decisions

**Why `serializeAttachment` for `lastAmen`?** Hibernation API puts DO to sleep between messages — JS heap gone on wake. `serializeAttachment`/`deserializeAttachment` = CF-native way to persist per-socket metadata across hibernation cycles.

**Why rate limit in DO, not Worker?** Worker stateless — can't know amens sent per socket. DO owns socket → correct place.

**Why no D1 storage for amens?** Amens = social signal, not completion data. Value is live animation, not aggregate. Storing adds latency, schema complexity, cost for zero product gain. Need "most reacted verse" later → add counter in Scheduled Worker from DO state.

---

## Feature 4 — Modos de revisão variados por maturidade do cartão

Three exercise modes exist: `flashcard` (mental recall), `fill-blank` (cloze), `typing` (free recall). Currently the user picks one mode for the whole session.

**Design decision: mode tied to card `state`, not random.**

Random interleaving has research backing (contextual interference effect) but ignores card maturity — grading a brand-new verse "again" because free typing is hard distorts SRS scheduling. The grade should reflect memory strength, not exercise difficulty.

Duolingo-inspired approach: simpler exercises for new concepts, harder for familiar ones.

| Card state                       | Assigned mode | Rationale                                |
| -------------------------------- | ------------- | ---------------------------------------- |
| `new` / `learning`               | `flashcard`   | Build schema first, low-stakes exposure  |
| `review`                         | `fill-blank`  | Active cloze recall, spaced gap          |
| `relearning`                     | `fill-blank`  | Reintroduce gently after lapse           |
| mature (`stability > threshold`) | `typing`      | Full free recall for consolidated memory |

**Implementation:** extend `DueItem` with `assignedMode: PracticeMode`. Derive at session load from `card.state` and `card.stability`. Keep manual mode selector for users who want full control — `assignedMode` only activates when user picks `'mixed'` (or a future default).

**Why not Anki's approach?** Anki fixes mode per card template at creation time — no dynamic switching. Works for Anki's single-user, manual-deck model. Here cards are generated automatically from verse additions, so mode must be derived programmatically.

**Why not purely random?** Random mode ignores the SRS grade signal. A hard typing exercise on a new card inflates "Again" ratings → card gets over-scheduled → user sees same new verse too often → burnout.

---

## Feature 5 — Versículo na sua foto — compartilhamento pós-memorização

Triggers at peak emotional moment — right after the user completes a memorization session. Proven mechanic: YouVersion hit 1 million shares in under two weeks with "I read this." The "I memorized this" hook carries higher emotional charge → higher share rate. Fits WhatsApp Status natively (vertical image, no caption needed).

**Stack:** satori + resvg-wasm, one Worker route (`GET /api/share/image?verseId=&translation=`)

```
User completes session
  → "Compartilhar" button appears on SessionComplete screen
  → GET /api/share/image?verseId=45_8_28&translation=NVI
  → Worker renders verse text + reference + app logo → PNG
  → navigator.share({ files: [png] }) or fallback download
```

**Worker route — server-side image generation:**

```js
import satori from 'satori'
import { Resvg } from '@resvg/resvg-wasm'

export async function handleShareImage(req, env) {
  const { verseId, translation } = new URL(req.url).searchParams
  const verse = await fetchVerse(verseId, translation, env)

  const svg = await satori(
    <div style={{ background: '#1a1a2e', width: 1080, height: 1080, ... }}>
      <p style={{ fontSize: 48, color: '#fff' }}>{verse.text}</p>
      <p style={{ fontSize: 32, color: '#aaa' }}>{verse.ref}</p>
      <p style={{ fontSize: 24, color: '#666' }}>Memorizado em remember.bible</p>
    </div>,
    { width: 1080, height: 1080, fonts: [...] }
  )

  const resvg = new Resvg(svg)
  const png = resvg.render().asPng()

  return new Response(png, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }
  })
}
```

**Client — Web Share API with PNG file:**

```js
async function shareVerse(verseId, translation) {
  const url = `/api/share/image?verseId=${verseId}&translation=${translation}`
  const blob = await fetch(url).then(r => r.blob())
  const file = new File([blob], 'versiculo.png', { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Versículo memorizado' })
  } else {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'versiculo.png'
    a.click()
  }
}
```

### Key decisions

**Why satori not canvas?** Canvas requires a browser context. satori runs in a Worker (edge, no DOM), produces deterministic SVG from JSX, resvg-wasm converts to PNG. Zero cold-start overhead beyond wasm init.

**Why cache the image?** Same verse + translation always produces same PNG. `Cache-Control: public, max-age=86400` lets CDN serve repeat shares for free. Vary only on `verseId+translation`.

**Why trigger at session complete, not verse add?** Session complete = emotional peak. User just proved they know the verse. Verse add = zero proof → share feels premature, WeeklyVerse social proof not yet earned.

---

## Feature 6 — Convite para grupo do WhatsApp — mensagem pré-formatada

Near-zero dev cost: a `wa.me/?text=` deep link with pre-filled verse text, community progress, and app invite URL. Brazilian church WhatsApp groups are the highest-trust distribution channel available — one tap reaches dozens of people who already share a faith context. No OG image needed. Ships in hours.

**Stack:** zero — pure client-side link construction

```js
function buildWhatsAppInvite({ verseRef, verseText, communityCount, appUrl }) {
  const text = [
    `📖 Estou memorizando *${verseRef}*:`,
    `_"${verseText}"_`,
    ``,
    `Já somos ${communityCount.toLocaleString('pt-BR')} pessoas memorizando juntas.`,
    `Vem memorizar também → ${appUrl}`,
  ].join('\n')

  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
```

**Placement:** secondary CTA on SessionComplete screen, below the primary share image button. Also surfaced on the home page community count banner ("Convidar amigos →").

### Key decisions

**Why `wa.me/?text=` not WhatsApp Business API?** No server, no approval process, no cost. `wa.me/?text=` opens WhatsApp with pre-filled text — user picks the group themselves. Business API requires message templates + approval + per-message cost, overkill for organic invite.

**Why pre-fill verse text not just a link?** The verse text in the message is the hook — group members read it before deciding to tap the link. A bare link gets ignored. A recognizable verse from someone they trust gets opened.

**Why no tracking on the invite link?** UTM params or short links add infra. At this stage, conversion signal comes from user signups + community count growth, not per-link attribution.