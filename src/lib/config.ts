import {
  DEFAULT_GEMINI_FALLBACK_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_MAX_UPLOAD_MB,
  DEFAULT_RATE_LIMIT_PER_MIN,
} from '@/lib/constants';
import { AppError } from '@/lib/errors';

type Env = Record<string, string | undefined>;

export interface ServerConfig {
  geminiApiKey: string;
  model: string;
  fallbackModel: string;
  maxUploadBytes: number;
  rateLimitPerMin: number;
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Reads limits and model names from the environment. Does not require the API key. */
export function getLimits(env: Env = process.env): {
  maxUploadBytes: number;
  rateLimitPerMin: number;
} {
  return {
    maxUploadBytes: positiveInt(env.MAX_UPLOAD_MB, DEFAULT_MAX_UPLOAD_MB) * 1024 * 1024,
    rateLimitPerMin: positiveInt(env.RATE_LIMIT_PER_MIN, DEFAULT_RATE_LIMIT_PER_MIN),
  };
}

/** Reads the full server configuration; throws a friendly error if the API key is missing. */
export function getServerConfig(env: Env = process.env): ServerConfig {
  const geminiApiKey = env.GEMINI_API_KEY?.trim();
  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY is not set');
    throw new AppError('not_configured', 'The service is not set up yet. Please try again later.');
  }
  return {
    geminiApiKey,
    model: env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    fallbackModel: env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_GEMINI_FALLBACK_MODEL,
    ...getLimits(env),
  };
}
