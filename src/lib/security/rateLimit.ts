const WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 5_000;

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitDecision;
}

interface RateLimiterOptions {
  limit: number;
  windowMs?: number;
  now?: () => number;
}

/**
 * Fixed-window limiter kept in process memory.
 * Best-effort only: on serverless or multi-instance hosting each instance counts separately,
 * so treat it as a speed bump against casual abuse, not a hard guarantee.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const windowMs = options.windowMs ?? WINDOW_MS;
  const now = options.now ?? Date.now;
  const windows = new Map<string, { count: number; resetAt: number }>();

  const sweepExpired = (current: number): void => {
    for (const [key, window] of windows) {
      if (window.resetAt <= current) windows.delete(key);
    }
  };

  return {
    check(key: string): RateLimitDecision {
      const current = now();
      if (windows.size >= MAX_TRACKED_KEYS) sweepExpired(current);

      const existing = windows.get(key);
      if (!existing || existing.resetAt <= current) {
        windows.set(key, { count: 1, resetAt: current + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      if (existing.count >= options.limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil((existing.resetAt - current) / 1000),
        };
      }
      existing.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

/**
 * Best guess at the caller's IP. Cloud Run and Vercel append the real client address to
 * `x-forwarded-for`, so the last entry is the hardest for a caller to spoof.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const last = forwarded?.split(',').at(-1)?.trim();
  return last || headers.get('x-real-ip') || 'unknown';
}
