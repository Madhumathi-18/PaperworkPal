import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/errors';
import { generate, type CallModel, type GeminiRequest } from '@/lib/gemini/client';

const request: GeminiRequest = {
  systemInstruction: 'system',
  contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
};
const models = { primary: 'primary-model', fallback: 'fallback-model' };

const apiError = (status: number): Error => Object.assign(new Error('boom'), { status });
const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);

beforeEach(() => {
  sleep.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

async function failureOf(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }
  throw new Error('Expected failure');
}

describe('generate', () => {
  it('returns the first successful answer without retrying', async () => {
    const callModel = vi.fn<CallModel>().mockResolvedValue('ok');
    await expect(generate(request, { callModel, sleep, models })).resolves.toBe('ok');
    expect(callModel).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries a 429 with growing backoff and then succeeds', async () => {
    const callModel = vi
      .fn<CallModel>()
      .mockRejectedValueOnce(apiError(429))
      .mockRejectedValueOnce(apiError(503))
      .mockResolvedValue('ok');
    await expect(generate(request, { callModel, sleep, models })).resolves.toBe('ok');
    expect(callModel.mock.calls.map(([model]) => model)).toEqual(Array(3).fill('primary-model'));
    const [first, second] = sleep.mock.calls.map((call) => Number(call[0] ?? 0));
    expect(second).toBeGreaterThan(first ?? 0);
  });

  it('falls back to the second model after the retries run out', async () => {
    const callModel = vi.fn<CallModel>().mockImplementation(async (model) => {
      if (model === 'primary-model') throw apiError(429);
      return 'from fallback';
    });
    await expect(generate(request, { callModel, sleep, models })).resolves.toBe('from fallback');
    expect(callModel).toHaveBeenCalledTimes(4);
  });

  it('falls back immediately when the primary model is not found', async () => {
    const callModel = vi.fn<CallModel>().mockImplementation(async (model) => {
      if (model === 'primary-model') throw apiError(404);
      return 'from fallback';
    });
    await expect(generate(request, { callModel, sleep, models })).resolves.toBe('from fallback');
    expect(callModel).toHaveBeenCalledTimes(2);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('gives a friendly 503 when every attempt is rate limited', async () => {
    const callModel = vi.fn<CallModel>().mockRejectedValue(apiError(429));
    const error = await failureOf(generate(request, { callModel, sleep, models }));
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('ai_unavailable');
    expect(error.status).toBe(503);
    expect(error.message).not.toContain('boom');
    expect(callModel).toHaveBeenCalledTimes(6);
  });

  it('treats timeouts like busy responses', async () => {
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    const callModel = vi.fn<CallModel>().mockRejectedValueOnce(timeout).mockResolvedValue('ok');
    await expect(generate(request, { callModel, sleep, models })).resolves.toBe('ok');
  });

  it('does not retry or fall back on auth problems', async () => {
    const callModel = vi.fn<CallModel>().mockRejectedValue(apiError(403));
    const error = await failureOf(generate(request, { callModel, sleep, models }));
    expect(error.code).toBe('not_configured');
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it('maps a rejected request (400) to a document problem', async () => {
    const callModel = vi.fn<CallModel>().mockRejectedValue(apiError(400));
    expect((await failureOf(generate(request, { callModel, sleep, models }))).code).toBe(
      'ai_bad_response',
    );
  });

  it('uses a single model when primary and fallback are the same', async () => {
    const callModel = vi.fn<CallModel>().mockRejectedValue(apiError(503));
    await failureOf(
      generate(request, { callModel, sleep, models: { primary: 'm', fallback: 'm' } }),
    );
    expect(callModel).toHaveBeenCalledTimes(3);
  });

  it('never logs the request contents', async () => {
    const callModel = vi.fn<CallModel>().mockRejectedValue(apiError(500));
    await failureOf(generate(request, { callModel, sleep, models }));
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('hi');
  });
});
