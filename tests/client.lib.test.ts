import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildChatContext, buildDeadlineEvent, buildReadAloudText } from '@/lib/analysisText';
import { ClientError, messageFromError, requestAnalysis, requestFollowUp } from '@/lib/client/api';
import { checkFile, compressImage, fitWithin } from '@/lib/client/files';
import { parsePreferences } from '@/lib/client/preferences';
import { redactPii } from '@/lib/security/redact';
import { SAMPLE_DOCUMENTS } from '@/samples';
import { validAnalysis } from './fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkFile', () => {
  it('accepts allowed types within the limit', () => {
    expect(checkFile({ type: 'application/pdf', size: 1000 })).toBeNull();
  });

  it('explains each kind of problem in plain language', () => {
    expect(checkFile({ type: 'image/gif', size: 10 })).toMatch(/JPG, PNG, WEBP/);
    expect(checkFile({ type: 'image/png', size: 0 })).toMatch(/empty/);
    expect(checkFile({ type: 'image/png', size: 6 * 1024 * 1024 })).toMatch(/under 5 MB/);
  });
});

describe('image compression helpers', () => {
  it('scales the longer side down to the maximum and keeps the shape', () => {
    expect(fitWithin(3200, 1600)).toEqual({ width: 1600, height: 800 });
    expect(fitWithin(1000, 4000)).toEqual({ width: 400, height: 1600 });
  });

  it('does not enlarge small images', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('returns PDFs and undecodable files untouched', async () => {
    const pdf = new File(['%PDF-'], 'a.pdf', { type: 'application/pdf' });
    expect(await compressImage(pdf)).toBe(pdf);
    const image = new File(['x'], 'a.png', { type: 'image/png' });
    expect(await compressImage(image)).toBe(image);
  });
});

describe('parsePreferences', () => {
  it('reads valid values and ignores bad ones', () => {
    expect(parsePreferences('{"textSize":"large","highContrast":true}')).toEqual({
      textSize: 'large',
      highContrast: true,
    });
    expect(parsePreferences('{"textSize":"huge","highContrast":"yes"}')).toEqual({
      textSize: 'normal',
      highContrast: false,
    });
    expect(parsePreferences('not json')).toEqual({ textSize: 'normal', highContrast: false });
    expect(parsePreferences(null)).toEqual({ textSize: 'normal', highContrast: false });
  });
});

describe('analysis text builders', () => {
  it('builds chat context from the result only', () => {
    const context = buildChatContext(validAnalysis);
    expect(context).toContain('Income Tax Notice');
    expect(context).toContain('Deadline: 2026-12-31');
    expect(context).toContain('1. Read the notice.');
  });

  it('builds read-aloud text with content in order', () => {
    const text = buildReadAloudText(validAnalysis, '31 December 2026');
    expect(text.indexOf(validAnalysis.summary)).toBeLessThan(text.indexOf('31 December 2026'));
    expect(text).toContain('3. Reply on the portal.');
  });

  it('builds a calendar event only when a date exists', () => {
    expect(buildDeadlineEvent(validAnalysis)?.date).toBe('2026-12-31');
    expect(
      buildDeadlineEvent({ ...validAnalysis, deadline: { date: null, consequenceIfMissed: 'x' } }),
    ).toBeNull();
  });
});

describe('API client', () => {
  const abort = new AbortController().signal;

  it('posts the document as form data and returns the analysis', async () => {
    const fetchMock = vi.fn(async () => Response.json(validAnalysis));
    vi.stubGlobal('fetch', fetchMock);
    const result = await requestAnalysis({ text: 'hello', language: 'hi' }, abort);
    expect(result.documentType).toBe('Income Tax Notice');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/analyze');
    expect((init.body as FormData).get('language')).toBe('hi');
    expect((init.body as FormData).get('text')).toBe('hello');
  });

  it('shows the server message for known errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { error: { code: 'payload_too_large', message: 'Too big.' } },
          { status: 413 },
        ),
      ),
    );
    await expect(requestAnalysis({ text: 'x', language: 'en' }, abort)).rejects.toThrow('Too big.');
  });

  it('uses a friendly message when the network fails or the reply is odd', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(requestAnalysis({ text: 'x', language: 'en' }, abort)).rejects.toThrow(/internet/);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ nope: true })),
    );
    await expect(requestAnalysis({ text: 'x', language: 'en' }, abort)).rejects.toBeInstanceOf(
      ClientError,
    );
  });

  it('sends follow-up questions as JSON and returns the answer', async () => {
    const fetchMock = vi.fn(async () => Response.json({ answer: 'Yes.' }));
    vi.stubGlobal('fetch', fetchMock);
    const answer = await requestFollowUp(
      { context: 'c', history: [], question: 'q', language: 'en' },
      abort,
    );
    expect(answer).toBe('Yes.');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ question: 'q' });
  });

  it('hides unexpected error details', () => {
    expect(messageFromError(new Error('stack trace here'))).toBe(
      'Something went wrong. Please try again.',
    );
  });
});

describe('sample documents', () => {
  const today = new Date('2026-11-23T10:00:00Z');

  it('provides three samples marked as fake', () => {
    expect(SAMPLE_DOCUMENTS).toHaveLength(3);
    for (const sample of SAMPLE_DOCUMENTS) {
      expect(sample.build(today)).toContain('SAMPLE DOCUMENT (FAKE)');
    }
  });

  it('uses deadlines relative to today so they are never expired', () => {
    expect(SAMPLE_DOCUMENTS[0]?.build(today)).toContain('21 December 2026');
  });

  it('includes fake personal details so redaction is visible in a demo', () => {
    for (const sample of SAMPLE_DOCUMENTS) {
      expect(redactPii(sample.build(today)).applied).toBe(true);
    }
  });
});
