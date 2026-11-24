import { createHash } from 'node:crypto';
import { CACHE_MAX_ENTRIES, CACHE_TTL_MS } from '@/lib/constants';

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export interface LruCacheOptions {
  maxEntries?: number;
  ttlMs?: number;
  /** Clock override, used by tests. */
  now?: () => number;
}

/**
 * Small in-memory cache with a size limit (least recently used goes first) and a TTL.
 * Lives in process memory only, so nothing is written to disk.
 */
export class LruCache<V> {
  private readonly entries = new Map<string, Entry<V>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(options: LruCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? CACHE_MAX_ENTRIES;
    this.ttlMs = options.ttlMs ?? CACHE_TTL_MS;
    this.now = options.now ?? Date.now;
  }

  /** Returns the cached value and marks it as recently used, or undefined on a miss. */
  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  /** Stores a value, evicting the least recently used entry when full. */
  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }
}

/** SHA-256 of the parts, length-prefixed so ("ab","c") and ("a","bc") differ. */
export function hashContent(...parts: Array<string | Uint8Array>): string {
  const hash = createHash('sha256');
  for (const part of parts) {
    const data = typeof part === 'string' ? Buffer.from(part, 'utf8') : part;
    hash.update(`${data.byteLength}:`);
    hash.update(data);
  }
  return hash.digest('hex');
}
