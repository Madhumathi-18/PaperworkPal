import { describe, expect, it, vi } from 'vitest';
import { getLimits, getServerConfig } from '@/lib/config';
import { AppError, toErrorBody } from '@/lib/errors';
import { getLanguage, LANGUAGES } from '@/lib/languages';

describe('getServerConfig', () => {
  it('applies defaults and reads overrides', () => {
    const config = getServerConfig({
      GEMINI_API_KEY: ' key ',
      MAX_UPLOAD_MB: '2',
      RATE_LIMIT_PER_MIN: '3',
    });
    expect(config).toMatchObject({
      geminiApiKey: 'key',
      maxUploadBytes: 2 * 1024 * 1024,
      rateLimitPerMin: 3,
    });
    expect(config.model).toBeTruthy();
    expect(config.fallbackModel).not.toBe(config.model);
  });

  it('throws a friendly 503 when the key is missing, without echoing details', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => getServerConfig({})).toThrow(AppError);
    try {
      getServerConfig({});
    } catch (error) {
      expect((error as AppError).status).toBe(503);
      expect((error as AppError).message).not.toMatch(/GEMINI/);
    }
  });

  it('ignores invalid numeric limits', () => {
    const limits = getLimits({
      MAX_UPLOAD_MB: 'abc',
      RATE_LIMIT_PER_MIN: '-4',
    });
    expect(limits).toEqual({ maxUploadBytes: 5 * 1024 * 1024, rateLimitPerMin: 10 });
  });
});

describe('toErrorBody', () => {
  it('passes through app errors', () => {
    const { status, body } = toErrorBody(new AppError('rate_limited', 'Slow down'));
    expect(status).toBe(429);
    expect(body).toEqual({ error: { code: 'rate_limited', message: 'Slow down' } });
  });

  it('hides unknown error details', () => {
    const { status, body } = toErrorBody(new Error('secret stack info'));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('secret');
  });
});

describe('languages', () => {
  it('lists the eight supported languages', () => {
    expect(LANGUAGES.map((language) => language.code)).toEqual([
      'en',
      'hi',
      'ta',
      'te',
      'kn',
      'ml',
      'bn',
      'mr',
    ]);
  });

  it('looks up languages and falls back to English', () => {
    expect(getLanguage('ta').bcp47).toBe('ta-IN');
    expect(getLanguage('zz').code).toBe('en');
  });
});
