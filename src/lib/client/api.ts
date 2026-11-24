import type { LanguageCode } from '@/lib/languages';
import type { Analysis, ChatMessage } from '@/types';

export interface AnalyzeInput {
  file?: File;
  text?: string;
  language: LanguageCode;
}

export interface FollowUpInput {
  context: string;
  history: ChatMessage[];
  question: string;
  language: LanguageCode;
}

const NETWORK_MESSAGE = 'We could not reach the server. Please check your internet and try again.';
const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

/** Error whose message is already written for the user. */
export class ClientError extends Error {}

function isAnalysis(value: unknown): value is Analysis {
  const item = value as Partial<Analysis> | null;
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.summary === 'string' &&
    typeof item.documentType === 'string' &&
    Array.isArray(item.actionSteps) &&
    Array.isArray(item.keyFacts) &&
    typeof item.deadline === 'object' &&
    typeof item.risk === 'object'
  );
}

async function post(
  url: string,
  body: BodyInit,
  signal: AbortSignal,
  json: boolean,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      body,
      signal,
      headers: json ? { 'Content-Type': 'application/json' } : undefined,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ClientError(NETWORK_MESSAGE);
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as { error?: { message?: unknown } } | null)?.error?.message;
    throw new ClientError(typeof message === 'string' ? message : GENERIC_MESSAGE);
  }
  return data;
}

/** Sends a document to the server and returns the explanation. */
export async function requestAnalysis(input: AnalyzeInput, signal: AbortSignal): Promise<Analysis> {
  const form = new FormData();
  form.set('language', input.language);
  if (input.text) form.set('text', input.text);
  if (input.file) form.set('file', input.file);
  const data = await post('/api/analyze', form, signal, false);
  if (!isAnalysis(data)) throw new ClientError(GENERIC_MESSAGE);
  return data;
}

/** Asks a follow-up question about the document and returns the answer. */
export async function requestFollowUp(input: FollowUpInput, signal: AbortSignal): Promise<string> {
  const data = await post('/api/chat', JSON.stringify(input), signal, true);
  const answer = (data as { answer?: unknown } | null)?.answer;
  if (typeof answer !== 'string') throw new ClientError(GENERIC_MESSAGE);
  return answer;
}

/** Message to show for any failure from the functions above. */
export function messageFromError(error: unknown): string {
  return error instanceof ClientError ? error.message : GENERIC_MESSAGE;
}
