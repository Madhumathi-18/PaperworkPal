import { describe, expect, it } from 'vitest';
import { analysisSchema, modelAnalysisSchema, toGeminiSchema } from '@/lib/gemini/schema';
import { validModelOutput } from './fixtures';

describe('modelAnalysisSchema', () => {
  it('accepts valid output', () => {
    expect(modelAnalysisSchema.safeParse(validModelOutput).success).toBe(true);
  });

  it('accepts a null deadline date', () => {
    const output = {
      ...validModelOutput,
      deadline: { date: null, consequenceIfMissed: 'Not mentioned' },
    };
    expect(modelAnalysisSchema.safeParse(output).success).toBe(true);
  });

  it.each([
    ['missing summary', { ...validModelOutput, summary: undefined }],
    ['unknown risk level', { ...validModelOutput, risk: { level: 'severe', reason: 'x' } }],
    [
      'wrong date format',
      { ...validModelOutput, deadline: { date: '31/12/2026', consequenceIfMissed: 'x' } },
    ],
    [
      'impossible date',
      { ...validModelOutput, deadline: { date: '2026-02-30', consequenceIfMissed: 'x' } },
    ],
    ['no action steps', { ...validModelOutput, actionSteps: [] }],
    ['too many steps', { ...validModelOutput, actionSteps: Array(8).fill('Do it.') }],
    ['too many questions', { ...validModelOutput, questionsToAsk: ['a', 'b', 'c', 'd'] }],
    ['steps not strings', { ...validModelOutput, actionSteps: [1, 2, 3] }],
  ])('rejects %s', (_name, output) => {
    expect(modelAnalysisSchema.safeParse(output).success).toBe(false);
  });

  it('drops unexpected extra fields', () => {
    const parsed = modelAnalysisSchema.parse({ ...validModelOutput, injected: 'ignore previous' });
    expect(parsed).not.toHaveProperty('injected');
  });
});

describe('analysisSchema', () => {
  it('requires language and redactionApplied', () => {
    expect(analysisSchema.safeParse(validModelOutput).success).toBe(false);
    expect(
      analysisSchema.safeParse({ ...validModelOutput, language: 'hi', redactionApplied: false })
        .success,
    ).toBe(true);
  });
});

describe('toGeminiSchema', () => {
  const schema = toGeminiSchema(modelAnalysisSchema);

  it('describes the object fields', () => {
    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties as object)).toContain('actionSteps');
  });

  it('removes keywords Gemini does not accept', () => {
    const json = JSON.stringify(schema);
    for (const keyword of ['"$schema"', '"pattern"', '"minLength"', '"maxLength"']) {
      expect(json).not.toContain(keyword);
    }
  });

  it('keeps enum and array limits', () => {
    const json = JSON.stringify(schema);
    expect(json).toContain('"enum":["low","medium","high"]');
    expect(json).toContain('"maxItems":7');
  });
});
