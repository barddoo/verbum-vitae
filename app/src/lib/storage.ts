const cache = new Map<string, string | null>()

export function cachedGet(key: string): string | null {
  if (!cache.has(key)) {
    cache.set(key, localStorage.getItem(key))
  }
  return cache.get(key)!
}

export function cachedSet(key: string, value: string) {
  localStorage.setItem(key, value)
  cache.set(key, value)
}

export function cachedRemove(key: string) {
  localStorage.removeItem(key)
  cache.delete(key)
}
