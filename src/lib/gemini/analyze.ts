import { ANALYSIS_PARSE_ATTEMPTS } from '@/lib/constants';
import { AppError } from '@/lib/errors';
import type { LanguageCode } from '@/lib/languages';
import { maskSensitiveValue, redactPii } from '@/lib/security/redact';
import type { ValidatedUpload } from '@/lib/security/validate';
import type { Analysis, ModelAnalysis } from '@/types';
import { generate } from './client';
import { buildAnalysisContents, buildAnalysisSystemPrompt } from './prompts';
import { modelAnalysisSchema, toGeminiSchema } from './schema';

export interface AnalyzeInput {
  /** Text that has already been redacted. */
  text?: string;
  file?: ValidatedUpload;
  language: LanguageCode;
}

const responseSchema = toGeminiSchema(modelAnalysisSchema);

function parseModelOutput(raw: string): ModelAnalysis | null {
  try {
    const result = modelAnalysisSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Asks Gemini to explain a document and returns validated output. If the answer is not
 * valid JSON in the expected shape, it asks once more before giving up.
 */
export async function analyzeDocument(input: AnalyzeInput): Promise<ModelAnalysis> {
  const request = {
    systemInstruction: buildAnalysisSystemPrompt(input.language),
    contents: buildAnalysisContents({
      text: input.text,
      language: input.language,
      file: input.file && {
        mimeType: input.file.mimeType,
        data: Buffer.from(input.file.bytes).toString('base64'),
      },
    }),
    responseSchema,
  };

  for (let attempt = 0; attempt < ANALYSIS_PARSE_ATTEMPTS; attempt += 1) {
    const parsed = parseModelOutput(await generate(request));
    if (parsed) return parsed;
  }
  throw new AppError(
    'ai_bad_response',
    'We could not understand the AI answer this time. Please try again or use a clearer copy.',
  );
}

const hideIdentifiers = (value: string): string => redactPii(value).text;

/**
 * Final safety pass on model output: hides any identifier the model echoed back (important
 * for photos and PDFs, which cannot be redacted before upload) and masks reference numbers.
 */
export function finalizeAnalysis(
  output: ModelAnalysis,
  meta: { language: LanguageCode; redactionApplied: boolean },
): Analysis {
  return {
    ...output,
    documentType: hideIdentifiers(output.documentType),
    summary: hideIdentifiers(output.summary),
    sender: hideIdentifiers(output.sender),
    whatTheyWant: hideIdentifiers(output.whatTheyWant),
    keyFacts: output.keyFacts.map((fact) => ({
      label: fact.label,
      value: maskSensitiveValue(fact.value),
    })),
    deadline: {
      date: output.deadline.date,
      consequenceIfMissed: hideIdentifiers(output.deadline.consequenceIfMissed),
    },
    actionSteps: output.actionSteps.map(hideIdentifiers),
    risk: { level: output.risk.level, reason: hideIdentifiers(output.risk.reason) },
    questionsToAsk: output.questionsToAsk.map(hideIdentifiers),
    language: meta.language,
    redactionApplied: meta.redactionApplied,
  };
}
