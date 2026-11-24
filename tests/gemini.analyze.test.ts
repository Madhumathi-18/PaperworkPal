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

describe('analyzeDocument script check', () => {
  // Malayalam letters inside a Tamil sentence: the glitch a small model can produce.
  const mixed = { ...validModelOutput, summary: 'தயவுசெய்து செலുത്തவும்' };
  const clean = { ...validModelOutput, summary: 'தயவுசெய்து செலுத்தவும்' };

  it('asks the model again, more strictly, when letters from another script slip in', async () => {
    generateMock
      .mockResolvedValueOnce(JSON.stringify(mixed))
      .mockResolvedValueOnce(JSON.stringify(clean));
    const result = await analyzeDocument({ text: 'notice', language: 'ta' });
    expect(result.summary).toBe(clean.summary);
    expect(generateMock).toHaveBeenCalledTimes(2);
    expect(generateMock.mock.calls[0]?.[0].systemInstruction).not.toContain('different script');
    expect(generateMock.mock.calls[1]?.[0].systemInstruction).toContain('different script');
  });

  it('keeps the answer rather than failing when the second try is still mixed', async () => {
    generateMock.mockResolvedValue(JSON.stringify(mixed));
    const result = await analyzeDocument({ text: 'notice', language: 'ta' });
    expect(result.summary).toBe(mixed.summary);
    expect(generateMock).toHaveBeenCalledTimes(2);
  });

  it('uses the mixed answer if the retry is not valid JSON', async () => {
    generateMock.mockResolvedValueOnce(JSON.stringify(mixed)).mockResolvedValueOnce('not json');
    const result = await analyzeDocument({ text: 'notice', language: 'ta' });
    expect(result.summary).toBe(mixed.summary);
  });

  it('does not ask twice for clean answers', async () => {
    generateMock.mockResolvedValue(JSON.stringify(clean));
    await analyzeDocument({ text: 'notice', language: 'ta' });
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it('never retries English, even if the document had names in another script', async () => {
    generateMock.mockResolvedValue(JSON.stringify({ ...validModelOutput, sender: 'राम कुमार' }));
    await analyzeDocument({ text: 'notice', language: 'en' });
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it('tells the model up front to use only the chosen script', async () => {
    generateMock.mockResolvedValue(JSON.stringify(clean));
    await analyzeDocument({ text: 'notice', language: 'ta' });
    expect(generateMock.mock.calls[0]?.[0].systemInstruction).toContain('only the Tamil script');
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

  it('asks again when the answer mixes in letters from another script', async () => {
    generateMock.mockResolvedValueOnce('செலുത്തவும்').mockResolvedValueOnce('செலுத்தவும்');
    const answer = await answerQuestion({
      context: 'Summary',
      history: [],
      question: 'என்ன செய்ய வேண்டும்?',
      language: 'ta',
    });
    expect(answer).toBe('செலுத்தவும்');
    expect(generateMock).toHaveBeenCalledTimes(2);
    expect(generateMock.mock.calls[1]?.[0].systemInstruction).toContain('different script');
  });

  it('answers once when the reply is clean', async () => {
    generateMock.mockResolvedValue('செலுத்தவும்');
    await answerQuestion({ context: 'Summary', history: [], question: 'எப்படி?', language: 'ta' });
    expect(generateMock).toHaveBeenCalledTimes(1);
  });
});
