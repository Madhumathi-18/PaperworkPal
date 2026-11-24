import { randomUUID } from 'node:crypto';
import { getLimits } from '@/lib/config';
import { AppError, toErrorBody } from '@/lib/errors';
import { createRateLimiter, getClientIp, type RateLimiter } from '@/lib/security/rateLimit';

let limiter: RateLimiter | undefined;

/** Throws a 429 when the caller has used up their requests for this route this minute. */
export function enforceRateLimit(request: Request, route: string): void {
  limiter ??= createRateLimiter({ limit: getLimits().rateLimitPerMin });
  const decision = limiter.check(`${route}:${getClientIp(request.headers)}`);
  if (!decision.allowed) {
    throw new RateLimitError(decision.retryAfterSeconds);
  }
}

/** A 429 that also tells the browser how long to wait. */
export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('rate_limited', 'You are sending requests too fast. Please wait a moment and try again.');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(body, { status, headers });
}

type Handler = (request: Request) => Promise<Response>;

/**
 * Wraps a route handler with a request id, safe error responses and a privacy-friendly log
 * line. The log has only the id, route, status and timing: never document text or PII.
 */
export function withRoute(route: string, handler: Handler): Handler {
  return async (request) => {
    const requestId = randomUUID();
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await handler(request);
    } catch (error) {
      const { status, body } = toErrorBody(error);
      const headers: Record<string, string> = {};
      if (error instanceof RateLimitError) headers['Retry-After'] = String(error.retryAfterSeconds);
      response = jsonResponse(body, status, headers);
    }
    response.headers.set('X-Request-Id', requestId);
    response.headers.set('Cache-Control', 'no-store');
    console.info(
      JSON.stringify({ requestId, route, status: response.status, ms: Date.now() - startedAt }),
    );
    return response;
  };
}

/** Reads a JSON body, turning malformed JSON into a 400. */
export async function readJson(request: Request): Promise<unknown> {
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
    throw new AppError('unsupported_media_type', 'Please send the request as JSON.');
  }
  try {
    return await request.json();
  } catch {
    throw new AppError('bad_request', 'The request could not be read. Please try again.');
  }
}
