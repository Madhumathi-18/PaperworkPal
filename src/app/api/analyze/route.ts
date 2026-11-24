import { readAnalyzeRequest } from '@/lib/api/analyzeRequest';
import { enforceRateLimit, jsonResponse, withRoute } from '@/lib/api/http';
import { hashContent, LruCache } from '@/lib/cache';
import { getLimits } from '@/lib/config';
import { AppError } from '@/lib/errors';
import { analyzeDocument, finalizeAnalysis } from '@/lib/gemini/analyze';
import { analysisSchema } from '@/lib/gemini/schema';
import { redactPii } from '@/lib/security/redact';
import {
  analyzeFieldsSchema,
  assertBodySize,
  parseOrThrow,
  validateUpload,
} from '@/lib/security/validate';
import type { Analysis } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Gemini can take up to ~30 s (plus a retry), which is longer than some hosts' default limit.
export const maxDuration = 60;

/** Results are keyed by a hash of the redacted content, so the cache never holds raw PII. */
const cache = new LruCache<Analysis>();

/** POST /api/analyze: turns a document (file and/or text) into a plain-language explanation. */
export const POST = withRoute('analyze', async (request) => {
  const { maxUploadBytes } = getLimits();
  enforceRateLimit(request, 'analyze');
  assertBodySize(request, maxUploadBytes);

  const raw = await readAnalyzeRequest(request);
  const { text, language } = parseOrThrow(analyzeFieldsSchema, raw);
  if (!text && !raw.file) {
    throw new AppError('bad_request', 'Please paste some text or choose a file to explain.');
  }

  const upload = raw.file ? await validateUpload(raw.file, maxUploadBytes) : undefined;
  const redaction = text ? redactPii(text) : undefined;

  const cacheKey = hashContent(redaction?.text ?? '', upload?.bytes ?? '', language);
  const cached = cache.get(cacheKey);
  if (cached) return jsonResponse(cached, 200, { 'X-Cache': 'HIT' });

  const output = await analyzeDocument({ text: redaction?.text, file: upload, language });
  const analysis = analysisSchema.parse(
    finalizeAnalysis(output, { language, redactionApplied: redaction?.applied ?? false }),
  );
  cache.set(cacheKey, analysis);
  return jsonResponse(analysis, 200, { 'X-Cache': 'MISS' });
});
