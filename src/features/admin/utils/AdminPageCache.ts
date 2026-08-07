interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Small per-screen cache for admin table pages. It deduplicates concurrent
 * requests and keeps recently visited/prefetched pages warm for fast paging.
 */
export class AdminPageCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly inFlight = new Map<string, Promise<T>>();
  private generation = 0;

  constructor(private readonly ttlMs = 30_000) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async load(key: string, loader: () => Promise<T>, force = false): Promise<T> {
    if (!force) {
      const cached = this.get(key);
      if (cached !== undefined) return cached;
      const pending = this.inFlight.get(key);
      if (pending) return pending;
    }

    const requestGeneration = this.generation;
    let request: Promise<T>;
    request = loader().then(value => {
      if (requestGeneration === this.generation) {
        this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
      }
      return value;
    }).finally(() => {
      if (this.inFlight.get(key) === request) this.inFlight.delete(key);
    });

    this.inFlight.set(key, request);
    return request;
  }

  prefetch(key: string, loader: () => Promise<T>): void {
    if (this.get(key) !== undefined || this.inFlight.has(key)) return;
    void this.load(key, loader).catch(() => undefined);
  }

  clear(): void {
    this.generation += 1;
    this.entries.clear();
  }
}

export const adminPageCacheKey = (scope: string, params: unknown): string =>
  `${scope}:${JSON.stringify(params)}`;
