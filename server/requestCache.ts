export class RequestCapacityError extends Error {}

export function createRequestCache<T>(load: (key: string) => Promise<T>, {
  maxEntries = 200, maxPending = 16, ttlMs = 30 * 60_000, now = Date.now,
} = {}) {
  const cache = new Map<string, { expiresAt: number; value: T }>();
  const pending = new Map<string, Promise<T>>();
  return {
    async get(key: string): Promise<T> {
      for (const [entryKey, entry] of cache) {
        if (entry.expiresAt <= now()) cache.delete(entryKey);
      }
      const entry = cache.get(key);
      if (entry) {
        cache.delete(key);
        cache.set(key, entry);
        return entry.value;
      }
      const existing = pending.get(key);
      if (existing) return existing;
      if (pending.size >= maxPending) throw new RequestCapacityError('Demasiadas consultas de clima. Inténtalo de nuevo en unos segundos.');
      const request = Promise.resolve().then(() => load(key)).then(value => {
        while (cache.size >= maxEntries) cache.delete(cache.keys().next().value!);
        cache.set(key, { value, expiresAt: now() + ttlMs });
        return value;
      }).finally(() => pending.delete(key));
      pending.set(key, request);
      return request;
    },
    get size() { return cache.size; },
    get inFlight() { return pending.size; },
  };
}
