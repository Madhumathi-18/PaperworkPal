import { z } from 'zod';
import { ACTION_STEPS_MAX, ACTION_STEPS_MIN, KEY_FACTS_MAX, QUESTIONS_MAX } from '@/lib/constants';
import { isValidIsoDate } from '@/lib/dates';
import { LANGUAGE_CODES } from '@/lib/languages';

/** What the model must return. Also the source of the JSON schema we send to Gemini. */
export const modelAnalysisSchema = z.object({
  documentType: z.string().min(1).max(120),
  summary: z.string().min(1).max(3000),
  sender: z.string().min(1).max(300),
  whatTheyWant: z.string().min(1).max(1000),
  keyFacts: z
    .array(z.object({ label: z.string().min(1).max(100), value: z.string().min(1).max(500) }))
    .max(KEY_FACTS_MAX),
  deadline: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(isValidIsoDate, 'Not a real calendar date')
      .nullable(),
    consequenceIfMissed: z.string().max(1000),
  }),
  actionSteps: z.array(z.string().min(1).max(400)).min(ACTION_STEPS_MIN).max(ACTION_STEPS_MAX),
  risk: z.object({
    level: z.enum(['low', 'medium', 'high']),
    reason: z.string().min(1).max(500),
  }),
  questionsToAsk: z.array(z.string().min(1).max(300)).max(QUESTIONS_MAX),
});

/** What `/api/analyze` returns: the model output plus fields we add ourselves. */
export const analysisSchema = modelAnalysisSchema.extend({
  language: z.enum(LANGUAGE_CODES),
  redactionApplied: z.boolean(),
});

/** JSON Schema keywords the Gemini structured-output feature does not accept. */
const UNSUPPORTED_KEYWORDS = new Set(['$schema', 'pattern', 'minLength', 'maxLength', 'default']);

function stripUnsupported(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupported);
  if (node !== null && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => !UNSUPPORTED_KEYWORDS.has(key))
        .map(([key, value]) => [key, stripUnsupported(value)]),
    );
  }
  return node;
}

/** Builds the Gemini `responseJsonSchema` from a zod schema, so there is one source of truth. */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  return stripUnsupported(z.toJSONSchema(schema, { target: 'draft-7' })) as Record<string, unknown>;
}
