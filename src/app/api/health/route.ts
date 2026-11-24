export const dynamic = 'force-dynamic';

/** GET /api/health: liveness check used by deployment platforms. */
export function GET(): Response {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
