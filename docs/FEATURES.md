## Feature 1 — "X pessoas estão memorizando agora"

**Stack:** Worker + Durable Object + KV

One global `PresenceDO` holds `Map<WebSocket, true>` of active sessions. User opens session page → client upgrades to WebSocket → Worker routes to DO → DO stores socket, broadcasts new count to all connected sockets. On disconnect: remove, re-broadcast. No storage, no DB.

```
Client → GET /ws/presence (Upgrade: websocket)
Worker → env.PRESENCE.get(idFromName('global'))
DO     → acceptWebSocket(server)
DO     → broadcast({ count: sessions.size }) to all
```

Clients that can't WebSocket (SSR, crawlers): `GET /api/presence/count` returns KV value, 30s TTL, updated by DO on every change.

**Worker routing:**
```js
export default {
  async fetch(req, env) {
    if (new URL(req.url).pathname === '/ws/presence') {
      const stub = env.PRESENCE.get(env.PRESENCE.idFromName('global'))
      return stub.fetch(req)
    }
  }
}
```

**Presence DO:**
```js
export class PresenceDO {
  sessions = new Map()

  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket')
      return Response.json({ count: this.sessions.size })

    const [client, server] = Object.values(new WebSocketPair())
    this.ctx.acceptWebSocket(server)
    this.sessions.set(server, true)
    this.broadcast()
    return new Response(null, { status: 101, webSocket: client })
  }

  webSocketClose(ws) { this.sessions.delete(ws); this.broadcast() }
  webSocketError(ws) { this.sessions.delete(ws); this.broadcast() }

  broadcast() {
    const msg = JSON.stringify({ count: this.sessions.size })
    for (const ws of this.sessions.keys())
      try { ws.send(msg) } catch { this.sessions.delete(ws) }
  }
}
```

> `acceptWebSocket` uses Hibernation API — DO sleeps between messages, no idle CPU cost across hundreds of open sockets.

---

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