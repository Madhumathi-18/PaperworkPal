import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validModelOutput } from './fixtures';
import { jsonRequest } from './helpers';

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

type Handler = (request: Request) => Promise<Response>;
let POST: Handler;

const rateLimited = (): Error => Object.assign(new Error('quota'), { status: 429 });

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  generateContent.mockReset();
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('GEMINI_MODEL', 'primary-model');
  vi.stubEnv('GEMINI_FALLBACK_MODEL', 'fallback-model');
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  ({ POST } = await import('@/app/api/analyze/route'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function send(): Promise<Response> {
  const pending = POST(jsonRequest('/api/analyze', { text: 'A letter' }));
  await vi.advanceTimersByTimeAsync(20_000);
  return pending;
}

describe('Gemini 429 handling through the real client', () => {
  it('retries the primary model, then succeeds on the fallback model', async () => {
    generateContent.mockImplementation(async ({ model }: { model: string }) => {
      if (model === 'primary-model') throw rateLimited();
      return { text: JSON.stringify(validModelOutput) };
    });
    const response = await send();
    expect(response.status).toBe(200);
    const models = generateContent.mock.calls.map(([args]) => args.model);
    expect(models).toEqual(['primary-model', 'primary-model', 'primary-model', 'fallback-model']);
  });

  it('returns a friendly error when both models stay rate limited', async () => {
    generateContent.mockRejectedValue(rateLimited());
    const response = await send();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe('ai_unavailable');
    expect(body.error.message).toMatch(/busy/i);
    expect(JSON.stringify(body)).not.toContain('quota');
  });

  it('sends the schema, the system prompt and the key only through the SDK call', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify(validModelOutput) });
    await send();
    const call = generateContent.mock.calls[0]?.[0];
    expect(call.config.responseMimeType).toBe('application/json');
    expect(call.config.responseJsonSchema).toBeDefined();
    expect(call.config.systemInstruction).toMatch(/untrusted data/);
  });

  it('reports a configuration problem without naming the variable when the key is missing', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const response = await send();
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('not_configured');
  });
});
