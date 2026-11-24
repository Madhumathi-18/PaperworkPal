import { AppError } from '@/lib/errors';
import { readJson } from './http';

export interface RawAnalyzeRequest {
  text?: unknown;
  language?: unknown;
  file?: File;
}

async function readForm(request: Request): Promise<RawAnalyzeRequest> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new AppError('bad_request', 'The upload could not be read. Please try again.');
  }
  const file = form.get('file');
  // Browsers send an empty, unnamed file part when no file was chosen.
  const hasFile = file instanceof File && !(file.size === 0 && file.name === '');
  return {
    text: form.get('text') ?? undefined,
    language: form.get('language') ?? undefined,
    file: hasFile ? file : undefined,
  };
}

/** Reads the analyze request from multipart form data (file and/or text) or from JSON (text). */
export async function readAnalyzeRequest(request: Request): Promise<RawAnalyzeRequest> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) return readForm(request);

  const body = await readJson(request);
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('bad_request', 'The request could not be read. Please try again.');
  }
  const { text, language } = body as Record<string, unknown>;
  return { text, language };
}
