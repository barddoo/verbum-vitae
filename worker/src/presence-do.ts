import { DurableObject } from 'cloudflare:workers'

type Env = {
  PRESENCE: DurableObjectNamespace<PresenceDO>
}

export class PresenceDO extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      const count = this.ctx.getWebSockets().length
      return Response.json({ count })
    }

    const [client, server] = Object.values(new WebSocketPair())
    this.ctx.acceptWebSocket(server)
    this.broadcast()
    return new Response(null, { status: 101, webSocket: client })
  }

  webSocketClose(): void {
    this.broadcast()
  }

  webSocketError(): void {
    this.broadcast()
  }

  broadcast(): void {
    const sockets = this.ctx.getWebSockets()
    const msg = JSON.stringify({ type: 'count', count: sockets.length })
    for (const ws of sockets) {
      try {
        ws.send(msg)
      } catch {
        // socket already dead — runtime removes it
      }
    }
  }
}
