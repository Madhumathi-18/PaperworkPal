export interface HeaderEntry {
  key: string;
  value: string;
}

/**
 * Content-Security-Policy for the app. Next.js injects small inline bootstrap scripts, so
 * `script-src` allows 'unsafe-inline' (a nonce would force every page to render dynamically).
 * Everything else is locked to our own origin. Dev mode also needs 'unsafe-eval' for hot reload.
 */
export function buildContentSecurityPolicy(isDevelopment: boolean): string {
  const scriptSrc = ["'self'", "'unsafe-inline'", ...(isDevelopment ? ["'unsafe-eval'"] : [])];
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`);
  if (!isDevelopment) policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}

/** Security headers applied to every response. The microphone is allowed for this origin only. */
export function buildSecurityHeaders(isDevelopment: boolean): HeaderEntry[] {
  return [
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(isDevelopment) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    {
      key: 'Permissions-Policy',
      value: 'microphone=(self), camera=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  ];
}
