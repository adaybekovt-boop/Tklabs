export type CachedHealth<T> = {
  value: T;
  stale: boolean;
  cached: boolean;
};

type Snapshot<T> = {
  value: T;
  expiresAt: number;
  staleUntil: number;
};

/** In-isolate cache: health checks are bounded and never call paid AI APIs. */
export class HealthSnapshotCache<T> {
  private snapshot: Snapshot<T> | null = null;

  constructor(private readonly ttlMs = 60_000, private readonly staleTtlMs = 5 * 60_000) {}

  async get(loader: () => Promise<T>, now = Date.now()): Promise<CachedHealth<T>> {
    if (this.snapshot && now < this.snapshot.expiresAt) {
      return { value: this.snapshot.value, stale: false, cached: true };
    }

    try {
      const value = await loader();
      this.snapshot = { value, expiresAt: now + this.ttlMs, staleUntil: now + this.staleTtlMs };
      return { value, stale: false, cached: false };
    } catch (error) {
      if (this.snapshot && now < this.snapshot.staleUntil) {
        return { value: this.snapshot.value, stale: true, cached: true };
      }
      throw error;
    }
  }

  clear() {
    this.snapshot = null;
  }
}
