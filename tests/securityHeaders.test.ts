import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, buildSecurityHeaders } from '@/lib/securityHeaders';

const headerMap = (isDev: boolean): Record<string, string> =>
  Object.fromEntries(buildSecurityHeaders(isDev).map(({ key, value }) => [key, value]));

describe('security headers', () => {
  const headers = headerMap(false);

  it('sets the standard hardening headers', () => {
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Strict-Transport-Security']).toContain('max-age=');
  });

  it('allows the microphone for this origin only and blocks other powerful features', () => {
    const policy = headers['Permissions-Policy'] ?? '';
    expect(policy).toContain('microphone=(self)');
    expect(policy).toContain('camera=()');
    expect(policy).toContain('geolocation=()');
  });

  it('locks the CSP to our own origin in production', () => {
    const csp = buildContentSecurityPolicy(false);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(csp).not.toContain('unsafe-eval');
  });

  it('only allows eval during development', () => {
    expect(buildContentSecurityPolicy(true)).toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy(true)).not.toContain('upgrade-insecure-requests');
  });
});
