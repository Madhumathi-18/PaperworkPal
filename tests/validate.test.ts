import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import {
  analyzeFieldsSchema,
  assertBodySize,
  chatRequestSchema,
  detectMimeFromMagic,
  parseOrThrow,
  validateUpload,
} from '@/lib/security/validate';

const MB = 1024 * 1024;
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];

const makeFile = (bytes: number[], type: string, padTo = 0): File =>
  new File(
    [new Uint8Array([...bytes, ...new Array(Math.max(0, padTo - bytes.length)).fill(0)])],
    'x',
    {
      type,
    },
  );

async function errorOf(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }
  throw new Error('Expected the promise to reject');
}

describe('detectMimeFromMagic', () => {
  it.each([
    [JPEG, 'image/jpeg'],
    [PNG, 'image/png'],
    [WEBP, 'image/webp'],
    [PDF, 'application/pdf'],
  ])('recognises %j', (bytes, expected) => {
    expect(detectMimeFromMagic(new Uint8Array(bytes))).toBe(expected);
  });

  it('returns null for unknown content', () => {
    expect(detectMimeFromMagic(new TextEncoder().encode('<script>alert(1)</script>'))).toBeNull();
    expect(
      detectMimeFromMagic(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 1, 2, 3, 4])),
    ).toBeNull();
  });
});

describe('validateUpload', () => {
  it('accepts each allowed type and returns the detected MIME type', async () => {
    const result = await validateUpload(makeFile(PNG, 'image/png'), 5 * MB);
    expect(result.mimeType).toBe('image/png');
    expect(result.bytes.byteLength).toBe(PNG.length);
  });

  it('rejects files over the limit with 413', async () => {
    const error = await errorOf(validateUpload(makeFile(JPEG, 'image/jpeg', 2 * MB), 1 * MB));
    expect(error.status).toBe(413);
    expect(error.message).toContain('under 1 MB');
  });

  it('rejects disallowed MIME types with 415', async () => {
    const error = await errorOf(validateUpload(makeFile(PDF, 'text/html'), 5 * MB));
    expect(error.status).toBe(415);
  });

  it('rejects a file whose bytes do not match its declared type', async () => {
    const error = await errorOf(validateUpload(makeFile(PDF, 'image/png'), 5 * MB));
    expect(error.status).toBe(415);
  });

  it('rejects a script disguised as an image', async () => {
    const script = new File(['<script>alert(1)</script>'], 'a.png', { type: 'image/png' });
    expect((await errorOf(validateUpload(script, 5 * MB))).status).toBe(415);
  });

  it('rejects an empty file with 400', async () => {
    const error = await errorOf(
      validateUpload(new File([], 'a.png', { type: 'image/png' }), 5 * MB),
    );
    expect(error.status).toBe(400);
  });
});

describe('assertBodySize', () => {
  const requestWith = (length: number): Request =>
    new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'content-length': String(length) },
      body: 'x',
    });

  it('throws 413 when the declared size is far above the limit', () => {
    expect(() => assertBodySize(requestWith(20 * MB), 5 * MB)).toThrow(/too large/);
  });

  it('allows bodies near the limit and requests without a length', () => {
    expect(() => assertBodySize(requestWith(5 * MB), 5 * MB)).not.toThrow();
    expect(() =>
      assertBodySize(new Request('http://localhost', { method: 'POST', body: 'x' }), 5 * MB),
    ).not.toThrow();
  });
});

describe('analyzeFieldsSchema', () => {
  it('defaults the language to English and trims text', () => {
    expect(analyzeFieldsSchema.parse({ text: '  hello  ' })).toEqual({
      text: 'hello',
      language: 'en',
    });
  });

  it('turns blank text into undefined', () => {
    expect(analyzeFieldsSchema.parse({ text: '   ' }).text).toBeUndefined();
  });

  it('rejects text over 20,000 characters and unknown languages', () => {
    expect(() => parseOrThrow(analyzeFieldsSchema, { text: 'a'.repeat(20_001) })).toThrow(
      /too long/,
    );
    expect(() => parseOrThrow(analyzeFieldsSchema, { text: 'a', language: 'fr' })).toThrow(
      /language/,
    );
  });
});

describe('chatRequestSchema', () => {
  const valid = { context: 'summary', question: 'When?', language: 'hi' };

  it('accepts a valid request and defaults history', () => {
    expect(parseOrThrow(chatRequestSchema, valid).history).toEqual([]);
  });

  it('rejects long questions, long histories and bad roles', () => {
    expect(() => parseOrThrow(chatRequestSchema, { ...valid, question: 'a'.repeat(501) })).toThrow(
      /500/,
    );
    const history = Array.from({ length: 11 }, () => ({ role: 'user', content: 'hi' }));
    expect(() => parseOrThrow(chatRequestSchema, { ...valid, history })).toThrow(/too long/);
    expect(() =>
      parseOrThrow(chatRequestSchema, { ...valid, history: [{ role: 'system', content: 'x' }] }),
    ).toThrow(AppError);
  });
});
