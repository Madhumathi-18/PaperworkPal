import { z } from 'zod';
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_CHAT_CONTEXT_CHARS,
  MAX_CHAT_HISTORY,
  MAX_CHAT_MESSAGE_CHARS,
  MAX_QUESTION_CHARS,
  MAX_TEXT_CHARS,
  MULTIPART_OVERHEAD_BYTES,
} from '@/lib/constants';
import { AppError } from '@/lib/errors';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from '@/lib/languages';

export type UploadMime = (typeof ALLOWED_UPLOAD_TYPES)[number];

const languageField = z.enum(LANGUAGE_CODES, {
  error: 'Please choose one of the listed languages.',
});

export const analyzeFieldsSchema = z.object({
  text: z
    .string()
    .trim()
    .max(MAX_TEXT_CHARS, `The text is too long. Please paste up to ${MAX_TEXT_CHARS} characters.`)
    .optional()
    .transform((value) => value || undefined),
  language: languageField.default(DEFAULT_LANGUAGE),
});

export const chatRequestSchema = z.object({
  context: z.string().trim().min(1, 'Missing document summary.').max(MAX_CHAT_CONTEXT_CHARS),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(MAX_CHAT_MESSAGE_CHARS),
      }),
    )
    .max(MAX_CHAT_HISTORY, 'This conversation is too long. Please start a new question.')
    .default([]),
  question: z
    .string()
    .trim()
    .min(1, 'Please type a question.')
    .max(MAX_QUESTION_CHARS, `Please keep your question under ${MAX_QUESTION_CHARS} characters.`),
  language: languageField.default(DEFAULT_LANGUAGE),
});

/** Parses input with a zod schema and turns the first problem into a friendly 400 error. */
export function parseOrThrow<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Some of the information is not valid.';
    throw new AppError('bad_request', message);
  }
  return result.data;
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0): boolean =>
  signature.every((value, index) => bytes[offset + index] === value);

/** Detects the real file type from its first bytes, or null if it is not an allowed type. */
export function detectMimeFromMagic(bytes: Uint8Array): UploadMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return 'image/webp';
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  return null;
}

export interface UploadCandidate {
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface ValidatedUpload {
  mimeType: UploadMime;
  bytes: Uint8Array;
}

/** Checks size, declared MIME type and magic bytes. Throws 413 or 415 on any mismatch. */
export async function validateUpload(
  file: UploadCandidate,
  maxBytes: number,
): Promise<ValidatedUpload> {
  const maxMb = Math.floor(maxBytes / (1024 * 1024));
  if (file.size === 0) throw new AppError('bad_request', 'The file is empty. Please pick another.');
  if (file.size > maxBytes) {
    throw new AppError(
      'payload_too_large',
      `The file is too large. Please use a file under ${maxMb} MB.`,
    );
  }
  const unsupported = new AppError(
    'unsupported_media_type',
    'We can only read JPG, PNG, WEBP photos and PDF files.',
  );
  if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) throw unsupported;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectMimeFromMagic(bytes);
  if (detected === null || detected !== file.type) throw unsupported;
  return { mimeType: detected, bytes };
}

/** Rejects requests whose declared body size is clearly over the limit, before reading it. */
export function assertBodySize(request: Request, maxUploadBytes: number): void {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxUploadBytes + MULTIPART_OVERHEAD_BYTES) {
    throw new AppError('payload_too_large', 'The upload is too large. Please use a smaller file.');
  }
}
