import { enforceRateLimit, jsonResponse, readJson, withRoute } from '@/lib/api/http';
import { answerQuestion } from '@/lib/gemini/chat';
import { chatRequestSchema, parseOrThrow } from '@/lib/security/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** POST /api/chat: answers a follow-up question using only the document summary. */
export const POST = withRoute('chat', async (request) => {
  enforceRateLimit(request, 'chat');
  const input = parseOrThrow(chatRequestSchema, await readJson(request));
  const answer = await answerQuestion(input);
  return jsonResponse({ answer });
});
