import { GoogleGenAI, type Content } from '@google/genai';
import { getServerConfig } from '@/lib/config';
import { GEMINI_BACKOFF_BASE_MS, GEMINI_MAX_RETRIES, GEMINI_TIMEOUT_MS } from '@/lib/constants';
import { AppError } from '@/lib/errors';

export interface GeminiRequest {
  systemInstruction: string;
  contents: Content[];
  /** JSON Schema for structured output. Omit for plain-text answers. */
  responseSchema?: Record<string, unknown>;
}

export type CallModel = (model: string, request: GeminiRequest) => Promise<string>;

export interface GenerateDeps {
  callModel?: CallModel;
  sleep?: (ms: number) => Promise<void>;
  models?: { primary: string; fallback: string };
}

const RETRYABLE_STATUSES = new Set([429, 503]);
const FALLBACK_STATUSES = new Set([404, 429, 500, 502, 503, 504]);

let sdkClient: GoogleGenAI | undefined;

/** Calls Gemini once. The API key is read on the server only and never reaches the browser. */
const callGemini: CallModel = async (model, request) => {
  sdkClient ??= new GoogleGenAI({ apiKey: getServerConfig().geminiApiKey });
  const response = await sdkClient.models.generateContent({
    model,
    contents: request.contents,
    config: {
      systemInstruction: request.systemInstruction,
      abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      ...(request.responseSchema && {
        responseMimeType: 'application/json',
        responseJsonSchema: request.responseSchema,
      }),
    },
  });
  const text = response.text?.trim();
  if (!text) throw new AppError('ai_bad_response', 'The AI helper did not return an answer.');
  return text;
};

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
}

function isTimeout(error: unknown): boolean {
  const name = (error as { name?: unknown } | null)?.name;
  return name === 'TimeoutError' || name === 'AbortError';
}

const isRetryable = (error: unknown): boolean =>
  isTimeout(error) || RETRYABLE_STATUSES.has(statusOf(error) ?? 0);

const canFallBack = (error: unknown): boolean =>
  isRetryable(error) || FALLBACK_STATUSES.has(statusOf(error) ?? 0);

/** Maps a raw SDK failure to a friendly error. Raw messages are never sent to the client. */
export function toFriendlyError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const status = statusOf(error);
  console.error(
    `Gemini request failed (status ${status ?? (isTimeout(error) ? 'timeout' : 'unknown')})`,
  );
  if (status === 401 || status === 403) {
    return new AppError(
      'not_configured',
      'The service is not set up correctly. Please try again later.',
    );
  }
  if (status === 400) {
    return new AppError(
      'ai_bad_response',
      'We could not read this document. Please try a clearer copy.',
    );
  }
  if (isRetryable(error)) {
    return new AppError(
      'ai_unavailable',
      'Our AI helper is very busy. Please wait a minute and try again.',
    );
  }
  return new AppError(
    'ai_unavailable',
    'Our AI helper is not available right now. Please try again soon.',
  );
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends a request to Gemini with resilience built in: a timeout per call, exponential
 * backoff on 429/503 (up to GEMINI_MAX_RETRIES), then one more round on the fallback model.
 */
export async function generate(request: GeminiRequest, deps: GenerateDeps = {}): Promise<string> {
  const callModel = deps.callModel ?? callGemini;
  const sleep = deps.sleep ?? defaultSleep;
  const config = deps.models ? undefined : getServerConfig();
  const primary = deps.models?.primary ?? config?.model ?? '';
  const fallback = deps.models?.fallback ?? config?.fallbackModel ?? '';
  const models = primary === fallback ? [primary] : [primary, fallback];

  let lastError: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
      try {
        return await callModel(model, request);
      } catch (error) {
        lastError = error;
        if (!canFallBack(error)) throw toFriendlyError(error);
        if (!isRetryable(error) || attempt === GEMINI_MAX_RETRIES) break;
        await sleep(GEMINI_BACKOFF_BASE_MS * 2 ** attempt + Math.random() * GEMINI_BACKOFF_BASE_MS);
      }
    }
  }
  throw toFriendlyError(lastError);
}
