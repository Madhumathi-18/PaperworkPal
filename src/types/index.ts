import type { z } from 'zod';
import type { analysisSchema, modelAnalysisSchema } from '@/lib/gemini/schema';

/** Validated model output before we add language and redaction info. */
export type ModelAnalysis = z.infer<typeof modelAnalysisSchema>;

/** The full result returned by `/api/analyze`. */
export type Analysis = z.infer<typeof analysisSchema>;

export type RiskLevel = Analysis['risk']['level'];

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
