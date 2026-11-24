import { describe, expect, it } from 'vitest';
import { createRateLimiter, getClientIp } from '@/lib/security/rateLimit';

describe('createRateLimiter', () => {
  it('allows up to the limit, then blocks with a retry time', () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => now });
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(true);
    now = 10_000;
    expect(limiter.check('ip')).toEqual({ allowed: false, retryAfterSeconds: 50 });
  });

  it('resets after the window passes', () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => now });
    limiter.check('ip');
    expect(limiter.check('ip').allowed).toBe(false);
    now = 1_000;
    expect(limiter.check('ip').allowed).toBe(true);
  });

  it('counts each key separately', () => {
    const limiter = createRateLimiter({ limit: 1 });
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('b').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
  });
});

describe('getClientIp', () => {
  it('uses the last forwarded address, which a caller cannot choose', () => {
    const headers = new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' });
    expect(getClientIp(headers)).toBe('203.0.113.9');
  });

  it('falls back to x-real-ip, then "unknown"', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '10.0.0.1' }))).toBe('10.0.0.1');
    expect(getClientIp(new Headers())).toBe('unknown');
  });
});
