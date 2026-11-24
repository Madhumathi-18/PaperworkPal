import { describe, expect, it } from 'vitest';
import { hashContent, LruCache } from '@/lib/cache';

describe('LruCache', () => {
  it('returns stored values and undefined on a miss', () => {
    const cache = new LruCache<string>();
    cache.set('a', '1');
    expect(cache.get('a')).toBe('1');
    expect(cache.get('missing')).toBeUndefined();
  });

  it('expires entries after the TTL', () => {
    let now = 1_000;
    const cache = new LruCache<string>({ ttlMs: 100, now: () => now });
    cache.set('a', '1');
    now += 99;
    expect(cache.get('a')).toBe('1');
    now += 1;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the least recently used entry when full', () => {
    const cache = new LruCache<number>({ maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  it('overwrites an existing key without growing', () => {
    const cache = new LruCache<number>({ maxEntries: 2 });
    cache.set('a', 1);
    cache.set('a', 2);
    expect(cache.size).toBe(1);
    expect(cache.get('a')).toBe(2);
  });

  it('can be cleared', () => {
    const cache = new LruCache<number>();
    cache.set('a', 1);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe('hashContent', () => {
  it('is stable and sensitive to every part', () => {
    expect(hashContent('abc', 'en')).toBe(hashContent('abc', 'en'));
    expect(hashContent('abc', 'en')).not.toBe(hashContent('abc', 'hi'));
  });

  it('does not confuse part boundaries', () => {
    expect(hashContent('ab', 'c')).not.toBe(hashContent('a', 'bc'));
  });

  it('hashes bytes and strings with the same content identically', () => {
    expect(hashContent(new TextEncoder().encode('hi'))).toBe(hashContent('hi'));
  });
});
