import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeDocument, finalizeAnalysis } from '@/lib/gemini/analyze';
import { answerQuestion } from '@/lib/gemini/chat';
import { generate } from '@/lib/gemini/client';
import { validModelOutput } from './fixtures';

vi.mock('@/lib/gemini/client', () => ({ generate: vi.fn() }));

const generateMock = vi.mocked(generate);

beforeEach(() => {
  generateMock.mockReset();
});

describe('analyzeDocument', () => {
  it('returns validated output and sends a JSON schema', async () => {
    generateMock.mockResolvedValue(JSON.stringify(validModelOutput));
    const result = await analyzeDocument({ text: 'notice', language: 'en' });
    expect(result.documentType).toBe('Income Tax Notice');
    expect(generateMock.mock.calls[0]?.[0].responseSchema).toBeDefined();
  });

  it('sends files as base64 inline data', async () => {
    generateMock.mockResolvedValue(JSON.stringify(validModelOutput));
    await analyzeDocument({
      file: { mimeType: 'image/png', bytes: new Uint8Array([65, 66, 67]) },
      language: 'en',
    });
    const parts = generateMock.mock.calls[0]?.[0].contents[0]?.parts;
    expect(parts?.[0]?.inlineData).toEqual({ mimeType: 'image/png', data: 'QUJD' });
  });

  it('asks again once when the first answer is malformed, then succeeds', async () => {
    generateMock
      .mockResolvedValueOnce('not json at all')
      .mockResolvedValueOnce(JSON.stringify(validModelOutput));
    await expect(analyzeDocument({ text: 'notice', language: 'en' })).resolves.toBeDefined();
    expect(generateMock).toHaveBeenCalledTimes(2);
  });

  it('fails with a friendly error when the shape is wrong twice', async () => {
    generateMock.mockResolvedValue(JSON.stringify({ ...validModelOutput, risk: { level: 'x' } }));
    await expect(analyzeDocument({ text: 'notice', language: 'en' })).rejects.toMatchObject({
      code: 'ai_bad_response',
      status: 503,
    });
    expect(generateMock).toHaveBeenCalledTimes(2);
  });
});

describe('finalizeAnalysis', () => {
  it('adds metadata, masks reference numbers and hides echoed identifiers', () => {
    const result = finalizeAnalysis(
      {
        ...validModelOutput,
        risk: { level: 'high', reason: 'Call 9876543210 now' },
        keyFacts: [
          { label: 'Reference', value: 'TXN12345678' },
          { label: 'PAN', value: 'ABCDE1234F' },
          { label: 'Due', value: '2026-12-31' },
        ],
      },
      { language: 'hi', redactionApplied: true },
    );
    expect(result.language).toBe('hi');
    expect(result.redactionApplied).toBe(true);
    expect(result.risk.reason).toBe('Call [PHONE] now');
    expect(result.keyFacts.map((fact) => fact.value)).toEqual([
      '•••••••5678',
      '[PAN]',
      '2026-12-31',
    ]);
  });
});

describe('answerQuestion', () => {
  it('redacts personal numbers the user typed before calling the model', async () => {
    generateMock.mockResolvedValue('Answer');
    await answerQuestion({
      context: 'Summary',
      history: [{ role: 'user', content: 'My PAN is ABCDE1234F' }],
      question: 'Call me at 9876543210?',
      language: 'en',
    });
    const sent = JSON.stringify(generateMock.mock.calls[0]?.[0].contents);
    expect(sent).not.toContain('ABCDE1234F');
    expect(sent).not.toContain('9876543210');
    expect(sent).toContain('[PAN]');
    expect(sent).toContain('[PHONE]');
  });
});
