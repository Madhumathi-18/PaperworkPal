/** Central place for every limit and tunable used by more than one module. */

export const MAX_TEXT_CHARS = 20_000;
export const MAX_QUESTION_CHARS = 500;
export const MAX_CHAT_HISTORY = 10;
export const MAX_CHAT_MESSAGE_CHARS = 4_000;
export const MAX_CHAT_CONTEXT_CHARS = 8_000;

export const DEFAULT_MAX_UPLOAD_MB = 5;
export const DEFAULT_RATE_LIMIT_PER_MIN = 10;
/** Extra bytes allowed on top of the file limit for multipart framing and form fields. */
export const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

export const CACHE_MAX_ENTRIES = 50;
export const CACHE_TTL_MS = 30 * 60 * 1000;

export const GEMINI_TIMEOUT_MS = 30_000;
export const GEMINI_MAX_RETRIES = 2;
export const GEMINI_BACKOFF_BASE_MS = 600;
export const ANALYSIS_PARSE_ATTEMPTS = 2;

export const ACTION_STEPS_MIN = 1;
export const ACTION_STEPS_MAX = 7;
export const QUESTIONS_MAX = 3;
export const KEY_FACTS_MAX = 12;

export const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const IMAGE_MAX_DIMENSION_PX = 1600;
export const IMAGE_JPEG_QUALITY = 0.8;

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
