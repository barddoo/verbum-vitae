import { cachedGet } from './storage'

const API_BASE = import.meta.env.VITE_API_URL || ''

async function request(path: string, options: RequestInit = {}) {
  const token = cachedGet('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((token && { Authorization: `Bearer ${token}` }) as Record<string, string>),
    ...((options.headers as Record<string, string>) || {}),
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `API error ${res.status}`)
  }

  return res.json()
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
    login: (email: string, password: string) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  },

  sync: {
    push: (entries: { tableName: string; rowId: string; operation: string; data: string }[]) =>
      request('/api/sync/push', { method: 'POST', body: JSON.stringify({ entries }) }),
    pull: (cursor?: string) => request(`/api/sync/pull${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
    pullCollections: () => request('/api/sync/pull/collections'),
  },

  verses: {
    get: (translation: string, bookNumber: number, chapter: number) => request(`/api/verses/${translation}/${bookNumber}/${chapter}`),
  },

  presence: {
    count: () => request('/api/presence/count'),
  },

  leaderboard: {
    get: () => request('/api/leaderboard'),
    updateProfile: (displayName: string) => request('/api/leaderboard/profile', { method: 'PATCH', body: JSON.stringify({ displayName }) }),
  },
}
